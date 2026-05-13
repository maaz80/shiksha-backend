import Location from "../models/Location.js";
import mongoose from "mongoose";

const slugifyText = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  || "item";

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const resolveLocationQuery = (locationIdentifier) => (
  isObjectId(locationIdentifier)
    ? { _id: locationIdentifier }
    : { slug: locationIdentifier }
);

const buildSlugRegex = (baseSlug) => new RegExp(`^${baseSlug}(?:_\\d+)?$`);

const makeUniqueFromSet = (baseSlug, existingSlugs) => {
  if (!existingSlugs.has(baseSlug)) return baseSlug;

  let counter = 2;
  let nextSlug = `${baseSlug}_${counter}`;
  while (existingSlugs.has(nextSlug)) {
    counter += 1;
    nextSlug = `${baseSlug}_${counter}`;
  }
  return nextSlug;
};

const generateUniqueLocationSlug = async (title, excludeId = null) => {
  const baseSlug = slugifyText(title || "location");
  const slugRegex = buildSlugRegex(baseSlug);
  const existing = await Location.find({ slug: slugRegex }).select("slug");

  const existingSlugs = new Set(
    existing
      .filter((doc) => !excludeId || String(doc._id) !== String(excludeId))
      .map((doc) => doc.slug)
  );

  return makeUniqueFromSet(baseSlug, existingSlugs);
};

const ensureLocationSlugAvailable = async (slug, excludeId = null) => {
  const existing = await Location.findOne({ slug }).select("_id");
  if (existing && (!excludeId || String(existing._id) !== String(excludeId))) {
    const error = new Error("Location slug already exists");
    error.statusCode = 400;
    throw error;
  }
};

const generateUniqueItemSlug = (locationDoc, title, excludeItemId = null) => {
  const baseSlug = slugifyText(title || "item");
  const existingSlugs = new Set(
    (locationDoc.items || [])
      .filter((item) => !excludeItemId || String(item._id) !== String(excludeItemId))
      .map((item) => item.slug)
      .filter(Boolean)
  );

  return makeUniqueFromSet(baseSlug, existingSlugs);
};

const ensureItemSlugAvailable = (locationDoc, slug, excludeItemId = null) => {
  const duplicate = (locationDoc.items || []).some((item) => (
    item.slug === slug && (!excludeItemId || String(item._id) !== String(excludeItemId))
  ));

  if (duplicate) {
    const error = new Error("Item slug already exists in this location");
    error.statusCode = 400;
    throw error;
  }
};

const cleanLocationPayload = (payload = {}) => {
  const cleaned = {};

  if (payload.title !== undefined) cleaned.title = payload.title;
  if (payload.slug?.trim()) cleaned.slug = payload.slug;

  return cleaned;
};

const findItemIndex = (locationDoc, itemIdentifier) => (
  (locationDoc.items || []).findIndex((item) => (
    String(item._id) === String(itemIdentifier) || item.slug === itemIdentifier
  ))
);

const ensureSlugsForLocation = async (locationDoc) => {
  let changed = false;

  if (!locationDoc.slug) {
    locationDoc.slug = await generateUniqueLocationSlug(locationDoc.title, locationDoc._id);
    changed = true;
  }

  const existingItemSlugs = new Set();
  (locationDoc.items || []).forEach((item) => {

    if (!item.slug || existingItemSlugs.has(item.slug)) {
      item.slug = makeUniqueFromSet(slugifyText(item.title || "item"), existingItemSlugs);
      changed = true;
    }
    existingItemSlugs.add(item.slug);
  });

  if (changed) {
    await locationDoc.save();
  }

  return locationDoc;
};


// ================= GET ALL SERVICES =================
export const getLocations = async (req, res) => {
  try {
    const data = await Location.find().sort({ createdAt: -1 });
    const withSlugs = await Promise.all(data.map((location) => ensureSlugsForLocation(location)));
    res.json(withSlugs);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};


// ================= GET SINGLE SERVICE =================
export const getLocationById = async (req, res) => {
  try {
    const data = await Location.findOne(resolveLocationQuery(req.params.id));
    if (!data) {
      return res.status(404).json({ error: "Location not found" });
    }
    await ensureSlugsForLocation(data);
    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

export const getLocationBySlug = async (req, res) => {
  try {
    const data = await Location.findOne({ slug: req.params.slug });
    if (!data) {
      return res.status(404).json({ error: "Location not found" });
    }
    await ensureSlugsForLocation(data);
    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};


// ================= CREATE SERVICE =================
export const createLocation = async (req, res) => {
  try {
    const parsed = cleanLocationPayload(JSON.parse(req.body.data || "{}"));
    if (parsed.slug) {
      parsed.slug = slugifyText(parsed.slug);
      await ensureLocationSlugAvailable(parsed.slug);
    } else {
      parsed.slug = await generateUniqueLocationSlug(parsed.title);
    }

    const location = new Location(parsed);
    await location.save();

    res.status(201).json(location);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};


// ================= UPDATE SERVICE =================
export const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = cleanLocationPayload(JSON.parse(req.body.data || "{}"));
    const existing = await Location.findOne(resolveLocationQuery(id));

    if (!existing) {
      return res.status(404).json({ error: "Location not found" });
    }

    if (parsed.slug) {
      parsed.slug = slugifyText(parsed.slug);
    } else if (!existing.slug || (parsed.title && parsed.title !== existing.title)) {
      parsed.slug = await generateUniqueLocationSlug(parsed.title, existing._id);
    }

    const updated = await Location.findByIdAndUpdate(
      existing._id,
      { $set: parsed },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};


// ================= DELETE SERVICE =================
export const deleteLocation = async (req, res) => {
  try {
    const existing = await Location.findOne(resolveLocationQuery(req.params.id));
    if (!existing) {
      return res.status(404).json({ error: "Location not found" });
    }
    await Location.findByIdAndDelete(existing._id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};


// ================= ADD ITEM =================
export const addItem = async (req, res) => {
  try {
    const { locationId } = req.params;
    const item = JSON.parse(req.body.data || "{}");
    item.keywords = item.keywords?.trim() || "";
    const location = await Location.findOne(resolveLocationQuery(locationId));
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    if (item.slug) {
      item.slug = slugifyText(item.slug);
      ensureItemSlugAvailable(location, item.slug);
    } else {
      item.slug = generateUniqueItemSlug(location, item.title);
    }

    location.items.push(item);
    await location.save();

    res.json(location);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

export const getItem = async (req, res) => {
  try {
    const { locationId, itemId } = req.params;
    const location = await Location.findOne(resolveLocationQuery(locationId));
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    await ensureSlugsForLocation(location);
    const itemIndex = findItemIndex(location, itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(location.items[itemIndex]);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};


// ================= UPDATE ITEM =================
export const updateItem = async (req, res) => {
  try {
    const { locationId, itemId } = req.params;

    const parsed = JSON.parse(req.body.data || "{}");
    const files = (req.files || []).filter((file) => file.fieldname === "locationImages");
    const indexes = req.body.locationImageIndex || [];
    const indexArray = Array.isArray(indexes) ? indexes : [indexes];

    const location = await Location.findOne(resolveLocationQuery(locationId));
    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    const itemIndex = findItemIndex(location, itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found" });
    }

    const currentItem = location.items[itemIndex];

    if (parsed?.page?.location?.cards) {
      parsed.page.location.cards = parsed.page.location.cards.map((card) => ({
        ...card,
        image: card.image || "",
      }));

      files.forEach((file, i) => {
        const index = Number(indexArray[i]);
        if (parsed.page.location.cards[index]) {
          parsed.page.location.cards[index].image = file.path;
        }
      });
    }

    const mergedItem = {
      ...currentItem.toObject(),
      ...parsed,
      _id: currentItem._id,
    };

    if (parsed.keywords !== undefined) {
      mergedItem.keywords = parsed.keywords?.trim() || "";
    }

    if (parsed.slug) {
      mergedItem.slug = slugifyText(parsed.slug);
      ensureItemSlugAvailable(location, mergedItem.slug, currentItem._id);
    } else if (parsed.title && parsed.title !== currentItem.title) {
      mergedItem.slug = currentItem.slug || generateUniqueItemSlug(location, parsed.title, currentItem._id);
    } else {
      mergedItem.slug = currentItem.slug || generateUniqueItemSlug(location, currentItem.title, currentItem._id);
    }

    location.items[itemIndex] = mergedItem;
    await location.save();

    res.json(location);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};


// ================= DELETE ITEM =================
export const deleteItem = async (req, res) => {
  try {
    const { locationId, itemId } = req.params;
    const location = await Location.findOne(resolveLocationQuery(locationId));

    if (!location) {
      return res.status(404).json({ error: "Location not found" });
    }

    const itemIndex = findItemIndex(location, itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Item not found" });
    }

    location.items.splice(itemIndex, 1);
    await location.save();

    res.json(location);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
