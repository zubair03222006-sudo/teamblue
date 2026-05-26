export const cacheImageLocally = async (url: string): Promise<string> => {
  if (!url) return '';
  
  // If it's already a local URL (like /generated/...), return as is
  if (url.startsWith('/')) return url;

  try {
    // Open the cache
    const cache = await caches.open('stylesense-image-cache');
    
    // Check if we already have the image
    const response = await cache.match(url);
    if (response) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
    
    // If not, fetch it and store in cache
    const fetchResponse = await fetch(url);
    if (fetchResponse.ok) {
      await cache.put(url, fetchResponse.clone());
      const blob = await fetchResponse.blob();
      return URL.createObjectURL(blob);
    }
  } catch (error) {
    console.error('Error caching image:', error);
  }
  
  // Fallback to original URL if caching fails
  return url;
};

export const clearImageCache = async () => {
  try {
    await caches.delete('stylesense-image-cache');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};
