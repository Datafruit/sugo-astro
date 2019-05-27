import db from '../models'

const findSugoRoleGalleriesByGalleryIds = async (GalleryIds) => {
  return await db.SugoRoleGalleries.findAll({
    where: {
      gallery_id: {
        $in: GalleryIds
      }
    }
  })
}
 
export default {
  findSugoRoleGalleriesByGalleryIds
}
