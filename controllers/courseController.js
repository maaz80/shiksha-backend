import mongoose from "mongoose";
import Course, { CoursePage } from "../models/Course.js";

const createSlug = (title) => {
     return title
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\s-]/g, "") // Keep alphanumeric, spaces, and existing hyphens
          .replace(/\s+/g, "-");
};

const generateUniqueSlug = async (title, excludeId = null) => {
     const baseSlug = createSlug(title) || "course";
     let slug = baseSlug;
     let count = 1;

     while (await Course.findOne({
          slug,
          ...(excludeId && { _id: { $ne: excludeId } })
     })) {
          slug = `${baseSlug}_${count++}`;
     }

     return slug;
};

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const parseSections = (sections) => {
     if (!sections) return [];
     return typeof sections === "string" ? JSON.parse(sections) : sections;
};

const parseFaq = (faq) => {
     if (!faq) return [];
     return typeof faq === "string" ? JSON.parse(faq) : faq;
};

const ensureCourseSlug = async (course) => {
     if (!course || course.slug) return course;

     course.slug = await generateUniqueSlug(course.title || course.name || "course", course._id);
     await course.save();
     return course;
};

const parseJSONField = (field) => {
     if (!field) return undefined;
     try {
          return typeof field === "string" ? JSON.parse(field) : field;
     } catch (e) {
          return field;
     }
};

const processSectionFields = (body, files) => {
     const sectionFields = {};

     if (body.socialProof !== undefined) sectionFields.socialProof = parseJSONField(body.socialProof);
     if (body.whyChooseUs !== undefined) sectionFields.whyChooseUs = parseJSONField(body.whyChooseUs);
     if (body.chooseLearning !== undefined) sectionFields.chooseLearning = parseJSONField(body.chooseLearning);
     if (body.benefitsCards !== undefined) sectionFields.benefitsCards = parseJSONField(body.benefitsCards);
     if (body.benefitsTag !== undefined) sectionFields.benefitsTag = body.benefitsTag;
     if (body.benefitsTitle !== undefined) sectionFields.benefitsTitle = body.benefitsTitle;
     if (body.benefitsSubtitle !== undefined) sectionFields.benefitsSubtitle = body.benefitsSubtitle;
     if (body.skillsYouWillLearn !== undefined) sectionFields.skillsYouWillLearn = parseJSONField(body.skillsYouWillLearn);
     if (body.whoShouldEnroll !== undefined) sectionFields.whoShouldEnroll = parseJSONField(body.whoShouldEnroll);
     if (body.jobRoles !== undefined) sectionFields.jobRoles = parseJSONField(body.jobRoles);

     let hiringPartners = parseJSONField(body.hiringPartners);
     if (hiringPartners && Array.isArray(hiringPartners.items) && Array.isArray(files)) {
          files.forEach(file => {
               const match = file.fieldname.match(/^hiringPartner_(\d+)$/);
               if (match) {
                    const idx = parseInt(match[1], 10);
                    if (hiringPartners.items[idx]) {
                         hiringPartners.items[idx].image = file.path;
                    }
               }
          });
     }
     if (hiringPartners !== undefined) sectionFields.hiringPartners = hiringPartners;

     let trainers = parseJSONField(body.trainers);
     if (trainers && Array.isArray(trainers.items) && Array.isArray(files)) {
          files.forEach(file => {
               const match = file.fieldname.match(/^trainer_(\d+)$/);
               if (match) {
                    const idx = parseInt(match[1], 10);
                    if (trainers.items[idx]) {
                         trainers.items[idx].image = file.path;
                    }
               }
          });
     }
     if (trainers !== undefined) sectionFields.trainers = trainers;

     if (body.certificationTitle !== undefined) sectionFields.certificationTitle = body.certificationTitle;
     if (body.certificationSubtitle !== undefined) sectionFields.certificationSubtitle = body.certificationSubtitle;
     if (body.certificationBullets !== undefined) sectionFields.certificationBullets = parseJSONField(body.certificationBullets);

     const certImg = (Array.isArray(files) ? files.find(f => f.fieldname === "certificationImage")?.path : undefined) || body.certificationImage;
     if (certImg) sectionFields.certificationImage = certImg;

     if (body.readyToStartJourney !== undefined) sectionFields.readyToStartJourney = parseJSONField(body.readyToStartJourney);

     return sectionFields;
};

// CREATE
export const createCourse = async (req, res) => {
     try {
          const parsedSections = parseSections(req.body.sections);
          const parsedFaq = parseFaq(req.body.faq);
          const slug = await generateUniqueSlug(req.body.title || req.body.name);

          const coverImg = req.file?.path || (Array.isArray(req.files) ? req.files.find(f => f.fieldname === "image")?.path : undefined) || req.body.image;
          
          let shortTermObj = parseJSONField(req.body.shortTerm);
          if (shortTermObj && Array.isArray(shortTermObj.items) && Array.isArray(req.files)) {
               req.files.forEach(file => {
                    const match = file.fieldname.match(/^shortTerm_(\d+)$/);
                    if (match) {
                         const idx = parseInt(match[1], 10);
                         if (shortTermObj.items[idx]) {
                              shortTermObj.items[idx].image = file.path;
                         }
                    }
               });
          }

          let rawVideos = parseJSONField(req.body.videos);
          if (Array.isArray(rawVideos)) {
               if (Array.isArray(req.files)) {
                    req.files.forEach(file => {
                         const match = file.fieldname.match(/^videoThumbnail_(\d+)$/);
                         if (match) {
                              const idx = parseInt(match[1], 10);
                              if (rawVideos[idx]) {
                                   rawVideos[idx].thumbnail = file.path;
                              }
                         }
                    });
               }
               rawVideos = rawVideos.map(v => ({
                    title: v?.title || "",
                    alt: v?.alt || "",
                    video: typeof v?.video === "string" ? v.video : "",
                    thumbnail: typeof v?.thumbnail === "string" ? v.thumbnail : ""
               }));
          } else {
               rawVideos = [];
          }

          const dynamicSectionData = processSectionFields(req.body, req.files);

          const rawFees = req.body.fees || req.body.price;
          if (rawFees !== undefined) {
               req.body.fees = String(rawFees);
               req.body.price = Number(String(rawFees || "").replace(/[^0-9.]/g, "")) || 0;
          }

          const course = new Course({
               ...req.body,
               ...dynamicSectionData,
               slug,
               sections: parsedSections,
               faq: parsedFaq,
               shortTerm: shortTermObj,
               caseStudies: parseJSONField(req.body.caseStudies),
               careerDomains: parseJSONField(req.body.careerDomains),
               videos: rawVideos,
               image: coverImg
          });

          await course.save();
          res.json(course);

     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const uploadCourseVideo = async (req, res) => {
     try {
          if (!req.file) {
               return res.status(400).json({ error: "No video file uploaded." });
          }

          res.json({ url: req.file.path });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// GET ALL
export const getCourses = async (req, res) => {
     try {
          const courses = await Course.find();
          for (const course of courses) {
               await ensureCourseSlug(course);
          }
          res.json(courses);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// GET ONE
export const getCourse = async (req, res) => {
     try {
          const { slug } = req.params;
          const course = isObjectId(slug)
               ? await Course.findById(slug)
               : await Course.findOne({ slug });

          if (!course) {
               return res.status(404).json({ error: "Course not found" });
          }

          await ensureCourseSlug(course);

          const courseObj = course.toObject();
          const pageData = await CoursePage.findOne();
          if (pageData) {
               if (!courseObj.caseStudies || !courseObj.caseStudies.items || courseObj.caseStudies.items.length === 0) {
                    courseObj.caseStudies = pageData.caseStudies;
               }
               if (!courseObj.careerDomains || !courseObj.careerDomains.items || courseObj.careerDomains.items.length === 0) {
                    courseObj.careerDomains = pageData.careerDomains;
               }
          }

          res.json(courseObj);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// UPDATE
export const updateCourse = async (req, res) => {
     try {
          const updateData = { ...req.body };

          if (req.body.fees !== undefined || req.body.price !== undefined) {
               const rawFees = req.body.fees !== undefined ? req.body.fees : req.body.price;
               updateData.fees = String(rawFees);
               updateData.price = Number(String(rawFees || "").replace(/[^0-9.]/g, "")) || 0;
          }

          const dynamicSectionData = processSectionFields(req.body, req.files);
          Object.assign(updateData, dynamicSectionData);

          if (req.body.sections) {
               updateData.sections = parseSections(req.body.sections);
          }

          if (req.body.faq) {
               updateData.faq = parseFaq(req.body.faq);
          }

          let shortTermObj = parseJSONField(req.body.shortTerm);
          if (shortTermObj && Array.isArray(shortTermObj.items) && Array.isArray(req.files)) {
               req.files.forEach(file => {
                    const match = file.fieldname.match(/^shortTerm_(\d+)$/);
                    if (match) {
                         const idx = parseInt(match[1], 10);
                         if (shortTermObj.items[idx]) {
                              shortTermObj.items[idx].image = file.path;
                         }
                    }
               });
          }
          if (shortTermObj) {
               updateData.shortTerm = shortTermObj;
          }

          if (req.body.caseStudies) {
               updateData.caseStudies = parseJSONField(req.body.caseStudies);
          }

          if (req.body.careerDomains) {
               updateData.careerDomains = parseJSONField(req.body.careerDomains);
          }

          if (req.body.videos) {
               let rawVideos = parseJSONField(req.body.videos);
               if (Array.isArray(rawVideos)) {
                    if (Array.isArray(req.files)) {
                         req.files.forEach(file => {
                              const match = file.fieldname.match(/^videoThumbnail_(\d+)$/);
                              if (match) {
                                   const idx = parseInt(match[1], 10);
                                   if (rawVideos[idx]) {
                                        rawVideos[idx].thumbnail = file.path;
                                   }
                              }
                         });
                    }
                    updateData.videos = rawVideos.map(v => ({
                         title: v?.title || "",
                         alt: v?.alt || "",
                         video: typeof v?.video === "string" ? v.video : "",
                         thumbnail: typeof v?.thumbnail === "string" ? v.thumbnail : ""
                    }));
               } else {
                    updateData.videos = [];
               }
          }

          if (req.body.title || req.body.name) {
               updateData.slug = await generateUniqueSlug(
                    req.body.title || req.body.name,
                    req.params.id
               );
          }

          const coverImg = req.file?.path || (Array.isArray(req.files) ? req.files.find(f => f.fieldname === "image")?.path : undefined);
          if (coverImg) {
               updateData.image = coverImg;
          }

          const updated = await Course.findByIdAndUpdate(
               req.params.id,
               updateData,
               { returnDocument: 'after' }
          );

          res.json(updated);

     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// DELETE
export const deleteCourse = async (req, res) => {
     await Course.findByIdAndDelete(req.params.id);
     res.json({ success: true });
};


// ✅ GET COURSE PAGE DATA (TITLES)
export const getCoursePageData = async (req, res) => {
     try {
          const pageData = await CoursePage.findOne();
          if (!pageData) {
               return res.json({
                    coursestitle: "All Courses"
               });
          }
          res.json(pageData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

// ✅ UPDATE COURSE PAGE DATA (TITLES)
export const updateCoursePageData = async (req, res) => {
     try {
          const pageData = await CoursePage.findOneAndUpdate({}, req.body, {
               upsert: true,
               returnDocument: 'after',
               setDefaultsOnInsert: true
          });
          res.json(pageData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const updateGlobalCourseConfig = async (req, res) => {
     try {
          let payload = req.body;
          if (req.body.data) {
               payload = typeof req.body.data === "string" ? JSON.parse(req.body.data) : req.body.data;
          }

          let caseStudies = payload.caseStudies || {};
          let careerDomains = payload.careerDomains || {};

          // Handle uploaded images for global case studies if any
          if (req.files && Array.isArray(req.files) && caseStudies.items) {
               req.files.forEach(file => {
                    const match = file.fieldname.match(/^globalCaseStudy_(\d+)$/);
                    if (match) {
                         const idx = parseInt(match[1], 10);
                         if (caseStudies.items[idx]) {
                              caseStudies.items[idx].image = file.path;
                         }
                    }
               });
          }

          const pageData = await CoursePage.findOneAndUpdate(
               {},
               { $set: { caseStudies, careerDomains } },
               { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
          );

          res.json({ success: true, pageData });
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

