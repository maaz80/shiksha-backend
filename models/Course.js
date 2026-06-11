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
}, { timestamps: true });

const coursePageSchema = new mongoose.Schema({
     coursestitle: String
});

const Course = mongoose.model("Course", courseSchema);
const CoursePage = mongoose.model("CoursePage", coursePageSchema);

export { CoursePage };
export default Course;
