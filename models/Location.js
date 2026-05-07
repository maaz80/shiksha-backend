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
  }
}, { _id: false });

const itemSchema = new mongoose.Schema({
  title: String,
  slug: String,

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
  description: String,
  image: String,

  items: [itemSchema]

}, { timestamps: true });

export default mongoose.model("Location", locationSchema);
