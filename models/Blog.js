import mongoose from "mongoose";

const blogSchema = new mongoose.Schema({

     title: {
          type: String,
          required: true
     },
     alt: {
          type: String,
          required: true
     },

     category: {
          type: String,
          required: true
     },

     date: {
          type: String,
          required: true
     },

     author: {
          type: String,
          required: true
     },

     description: {
          type: String,
          required: true
     },

     content: {
          type: String,
          required: true
     },

     image: {
          type: String,
          required: true
     },
     slug: {
          type: String,
          unique: true,
          required: true
     },
     seoTitle: {
          type: String,
          trim: true
     },
     seoDescription: {
          type: String,
          trim: true
     },
     seoKeywords: {
          type: String,
          trim: true
     },

}, { timestamps: true });

const Blog = mongoose.model("Blog", blogSchema);

export default Blog;