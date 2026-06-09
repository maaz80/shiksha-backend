import Image from "../models/Image.js";

export const uploadImage = async (req, res) => {

     try {

          const image = new Image({
               title: req.body.title,
               image: req.file.path
          });

          await image.save();

          res.json(image);

     } catch (err) {

          res.status(500).json({ error: err.message });

     }

};



export const getImages = async (req, res) => {

     const images = await Image.find().sort({ createdAt: -1 });

     res.json(images);

};



export const deleteImage = async (req, res) => {

     await Image.findByIdAndDelete(req.params.id);

     res.json({ message: "Deleted" });

};



export const updateImage = async (req, res) => {

     const updated = await Image.findByIdAndUpdate(
          req.params.id,
          { title: req.body.title },
          { new: true }
     );

     res.json(updated);

};