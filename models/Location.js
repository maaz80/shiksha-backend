import mongoose from "mongoose";

const heroSchema = new mongoose.Schema({
  title: String,
  description: String,
  points: [String],
}, { _id: false });

const pageSchema = new mongoose.Schema({
  help: {
    title: String,
    description: String,
    cards: [
      {
        head: String,
        subhead: String,
        para: String,
      }
    ]
  },
  location: {
    title: String,
    description: String,
    cards: [
      {
        image: String,
        para: String,
      }
    ]
  },
  why: {
    title: String,
    content: String,
  },
  faq: [
    {
      ques: String,
      ans: String,
    }
  ]
}, { _id: false });

const itemSchema = new mongoose.Schema({
  title: String,
  slug: String,
  description: String,
  keywords: mongoose.Schema.Types.Mixed,

  hero: heroSchema,

  page: pageSchema
}, { _id: true });

const locationSchema = new mongoose.Schema({
  title: String,
  slug: {
    type: String,
    unique: true,
    sparse: true
  },

  items: [itemSchema]

}, { timestamps: true });

export default mongoose.model("Location", locationSchema);
