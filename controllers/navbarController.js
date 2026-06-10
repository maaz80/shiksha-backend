import Navbar from "../models/Navbar.js";

// Get Navbar Configuration
export const getNavbarData = async (req, res) => {
     try {
          const navbarData = await Navbar.findOne();
          if (!navbarData) {
               return res.json({
                    logo: "",
                    buttonName: "All Courses",
                    searchPlaceholder: "Search your course",
                    dropdownName: "More",
                    dropdownItems: [
                         { name: "Resources", link: "#" },
                         { name: "Hire From Us", link: "#" }
                    ],
                    logoutButtonName: "Logout"
               });
          }
          res.json(navbarData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};

export const updateNavbarData = async (req, res) => {
     try {
          const updateData = { ...req.body };

          if (req.file) {
               updateData.logo = req.file.path;
          }

          if (updateData.dropdownItems) {
               try {
                    updateData.dropdownItems = typeof updateData.dropdownItems === "string"
                         ? JSON.parse(updateData.dropdownItems)
                         : updateData.dropdownItems;
               } catch (err) {
                    console.error("Error parsing dropdownItems:", err);
                    updateData.dropdownItems = [];
               }
          }

          const navbarData = await Navbar.findOneAndUpdate({}, updateData, {
               upsert: true,
               new: true,
               setDefaultsOnInsert: true
          });
          res.json(navbarData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
