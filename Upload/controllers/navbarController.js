import Navbar from "../models/Navbar.js";

// Get Navbar Configuration
export const getNavbarData = async (req, res) => {
     try {
          const navbarData = await Navbar.findOne();
          if (!navbarData) {
               return res.json({
                    logo: "",
                    buttonName: "All Courses",
                    searchPlaceholder: "What do you want to learn ?",
                    dropdownName: "More",
                    dropdownItems: [
                         { name: "Resources", link: "#" },
                         { name: "Hire From Us", link: "#" }
                    ],
                    logoutButtonName: "Logout",
                    moreItems: {
                         title: "More",
                         dropdown_items: [
                              {
                                   title: "Resources",
                                   items: [
                                        { name: "Blogs", link: "/blog" },
                                        { name: "About Us", link: "/about-us" }
                                   ]
                              },
                              {
                                   title: "Company",
                                   items: [
                                        { name: "Contact Us", link: "/contact-us" }
                                   ]
                              }
                         ]
                    }
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

          if (updateData.moreItems) {
               try {
                    updateData.moreItems = typeof updateData.moreItems === "string"
                         ? JSON.parse(updateData.moreItems)
                         : updateData.moreItems;
               } catch (err) {
                    console.error("Error parsing moreItems:", err);
                    updateData.moreItems = { title: "More", dropdown_items: [] };
               }
          }

          const navbarData = await Navbar.findOneAndUpdate({}, updateData, {
               upsert: true,
               returnDocument: 'after',
               setDefaultsOnInsert: true
          });
          res.json(navbarData);
     } catch (err) {
          res.status(500).json({ error: err.message });
     }
};
