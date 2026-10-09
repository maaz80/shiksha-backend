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
     price: Number,
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

     // 14 Dynamic Sections Fields
     socialProof: [{
          iconName: String,
          name: String,
          value: String
     }],

     whyChooseUs: {
          title: String,
          subtitle: String,
          items: [{
               title: String,
               description: String,
               iconName: String,
               color: String
          }]
     },

     chooseLearning: {
          title: String,
          subtitle: String,
          emi: {
               title: String,
               subtitle: String,
               bannerTitle: String,
               bannerSubtitle: String,
               approvalTitle: String,
               approvalSubtitle: String,
               points: [String]
          },
          scholarship: {
               title: String,
               subtitle: String,
               discountAmount: String,
               discountLabel: String,
               discountText: String,
               discountSubtext: String,
               meritTitle: String,
               meritSubtitle: String,
               points: [String]
          },
          batches: {
               title: String,
               subtitle: String,
               bannerTitle: String,
               bannerSubtitle: String,
               featureTitle: String,
               featureSubtitle: String,
               items: [{
                    dayDate: String,
                    month: String,
                    title: String,
                    time: String,
                    status: String
               }]
          }
     },

     benefitsCards: [{
          title: String,
          description: String,
          iconName: String
     }],
     benefitsTag: String,
     benefitsTitle: String,
     benefitsSubtitle: String,

     skillsYouWillLearn: {
          title: String,
          skills: [String]
     },

     whoShouldEnroll: {
          title: String,
          subtitle: String,
          items: [{
               title: String,
               description: String,
               iconName: String
          }]
     },

     jobRoles: {
          tag: String,
          title: String,
          description: String,
          items: [{
               step: String,
               title: String,
               description: String,
               keyFocusTitle: String,
               keyFocus: String,
               iconName: String
          }]
     },

     hiringPartners: {
          title: String,
          subtitle: String,
          items: [{
               name: String,
               image: String
          }]
     },

     trainers: {
          title: String,
          subtitle: String,
          items: [{
               name: String,
               role: String,
               bio: String,
               rating: String,
               students: String,
               image: String,
               linkedin: String
          }]
     },

     certificationTitle: String,
     certificationSubtitle: String,
     certificationBullets: [String],
     certificationImage: String,

     readyToStartJourney: {
          title: String,
          subtitle: String,
          button1Text: String,
          button1Link: String,
          button2Text: String,
          button2Link: String
     },

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

     // Active Live Class Status
     liveClass: {
          platform: { type: String, default: "zoom" },
          meetUrl: { type: String, default: "" },
          startUrl: { type: String, default: "" },
          zoomMeetingId: { type: String, default: "" },
          passcode: { type: String, default: "" },
          title: { type: String, default: "" },
          scheduledAt: { type: String, default: "Live Now" },
          instructions: { type: String, default: "" },
          active: { type: Boolean, default: false },
          updatedAt: { type: Date, default: Date.now }
     },

     // Session Cloud Recordings History
     recordings: [{
          id: String,
          title: String,
          videoUrl: String,
          downloadUrl: String,
          duration: String,
          meetingId: String,
          createdAt: { type: Date, default: Date.now }
     }],
}, { strict: false, timestamps: true });

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
