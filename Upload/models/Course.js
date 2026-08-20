import mongoose from "mongoose";

const lessonSchema = new mongoose.Schema({
     title: String,
     duration: String, // "12:30"
     videoUrl: String,
     isPreview: { type: Boolean, default: false },
     isLocked: { type: Boolean, default: false }
});

const sectionSchema = new mongoose.Schema({
     title: String,
     lessons: [lessonSchema]
});

const courseSchema = new mongoose.Schema({
     title: String,
     category: String,
     name: String,
     slug: {
          type: String,
          unique: true,
          sparse: true,
          required: true
     },

     courseLength: String, // "2 Weeks"
     students: Number,
     level: String, // "All Levels"
     totalLessons: Number,

     image: String,
     overview: String,

     fees: String,
     deadline: String,

     sections: [sectionSchema], // curriculum

     // Section 1: Promo Fields
     promoTitle: String,
     promoDescription: String,
     promoBenefits: String,
     promoSocialBottomContent: String,

     // Section 2: Brochure Fields
     brochureTitle: String,
     brochureSubtext: String,
     brochurePhones: String,
     brochureLink: String,

     // Section 3: Short-Term Courses
     shortTerm: {
          title: String,
          description: String,
          items: [{
               title: String,
               description: String,
               duration: String,
               iconText: String,
               image: String,
               alt: String
          }]
     },

     // Section 4: Case Studies
     caseStudies: {
          title: String,
          description: String,
          buttonText: String,
          items: [{
               image: String,
               alt: String,
               link: String
          }]
     },

     // Section 5: Career Domains
     careerDomains: {
          title: String,
          description: String,
          items: [{
               name: String,
               link: String,
               iconName: String,
               color: String
          }]
     },

     alt: {
          type: String,
          default: ""
     },
     seoTitle: {
          type: String,
          trim: true,
          default: ""
     },
     seoDescription: {
          type: String,
          trim: true,
          default: ""
     },
     reviews: [{
          name: String,
          role: String,
          rating: Number,
          text: String,
          image: String,
          date: { type: Date, default: Date.now }
     }],
     videos: [{
          title: String,
          alt: String,
          video: String,
          thumbnail: String
     }],
     faq: [{
          ques: String,
          ans: String
     }],
}, { timestamps: true });

const coursePageSchema = new mongoose.Schema({
     coursestitle: String,
     caseStudies: {
          title: String,
          description: String,
          buttonText: String,
          items: [{
               image: String,
               alt: String,
               link: String
          }]
     },
     careerDomains: {
          title: String,
          description: String,
          items: [{
               name: String,
               link: String,
               iconName: String,
               color: String
          }]
     }
}, { strict: false, timestamps: true });

const Course = mongoose.model("Course", courseSchema);
const CoursePage = mongoose.model("CoursePage", coursePageSchema);

export { CoursePage };
export default Course;
