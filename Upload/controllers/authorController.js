import Author from "../models/Author.js";
import Blog from "../models/Blog.js";

// @desc    Get all authors
// @route   GET /api/authors
export const getAllAuthors = async (req, res) => {
  try {
    const authors = await Author.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: authors.length, data: authors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single author by ID or Slug with their blogs
// @route   GET /api/authors/:identifier
export const getAuthorByIdOrSlug = async (req, res) => {
  try {
    const { identifier } = req.params;
    const isObjectId = identifier.match(/^[0-9a-fA-F]{24}$/);
    
    const author = isObjectId 
      ? await Author.findById(identifier)
      : await Author.findOne({ slug: identifier });

    if (!author) {
      return res.status(404).json({ success: false, message: "Author not found" });
    }

    // Fetch blogs associated with this author (by authorRef or by author string matching author name)
    const blogs = await Blog.find({
      $or: [
        { authorRef: author._id },
        { author: author.name }
      ]
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        author,
        blogs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new author
// @route   POST /api/authors
export const createAuthor = async (req, res) => {
  try {
    const { name, designation, bio, avatar, email, socialLinks, isFeatured } = req.body;

    let avatarUrl = avatar;
    if (req.file) {
      avatarUrl = req.file.path || req.file.secure_url;
    }

    let parsedSocialLinks = {};
    if (socialLinks) {
      parsedSocialLinks = typeof socialLinks === "string" ? JSON.parse(socialLinks) : socialLinks;
    }

    const newAuthor = await Author.create({
      name,
      designation,
      bio,
      avatar: avatarUrl || undefined,
      email,
      socialLinks: parsedSocialLinks,
      isFeatured: isFeatured === "true" || isFeatured === true,
    });

    res.status(201).json({ success: true, message: "Author created successfully", data: newAuthor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update author
// @route   PUT /api/authors/:id
export const updateAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, designation, bio, avatar, email, socialLinks, isFeatured } = req.body;

    let updateData = {
      name,
      designation,
      bio,
      email,
      isFeatured: isFeatured === "true" || isFeatured === true,
    };

    if (avatar) updateData.avatar = avatar;
    if (req.file) updateData.avatar = req.file.path || req.file.secure_url;
    if (socialLinks) {
      updateData.socialLinks = typeof socialLinks === "string" ? JSON.parse(socialLinks) : socialLinks;
    }

    const updatedAuthor = await Author.findByIdAndUpdate(id, updateData, { returnDocument: 'after', runValidators: true });

    if (!updatedAuthor) {
      return res.status(404).json({ success: false, message: "Author not found" });
    }

    res.status(200).json({ success: true, message: "Author updated successfully", data: updatedAuthor });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete author
// @route   DELETE /api/authors/:id
export const deleteAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const author = await Author.findByIdAndDelete(id);

    if (!author) {
      return res.status(404).json({ success: false, message: "Author not found" });
    }

    res.status(200).json({ success: true, message: "Author deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
