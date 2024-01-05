function getPublicIdFromUrl(photoUrl) {
  const parts = photoUrl.split("/");
  const publicIdIndex = parts.findIndex((part) => part === "upload");
  if (publicIdIndex !== -1 && publicIdIndex < parts.length - 1) {
    return parts[publicIdIndex + 1].replace(/\..*/, ""); // Récupère le public_id avant l'extension
  }
  return null;
}

module.exports = { getPublicIdFromUrl };
