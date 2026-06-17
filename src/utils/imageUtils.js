// src/utils/imageUtils.js

/**
 * Convert a File object to a Base64 string
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Compress image before converting to Base64
 * Reduces size to max 400x400 with 75% quality
 */
export const compressAndConvertToBase64 = (file, maxWidth = 400, maxHeight = 400, quality = 0.75) => {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

/**
 * Get file size in KB from base64 string
 */
export const getBase64SizeKB = (base64String) => {
  if (!base64String) return 0;
  const base64 = base64String.split(',')[1] || base64String;
  return Math.round((base64.length * 3) / 4 / 1024);
};

/**
 * Validate image file type and size (max 2MB)
 */
export const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSizeMB = 2;

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and WebP images are allowed.' };
  }

  if (file.size > maxSizeMB * 1024 * 1024) {
    return { valid: false, error: `Image must be smaller than ${maxSizeMB}MB.` };
  }

  return { valid: true };
};
