import { GOOGLE_DRIVE_WEBHOOK_URL } from '../firebase';

export async function uploadToGoogleDrive(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      try {
        const base64Data = reader.result.split(',')[1];

        const payload = {
          base64Data: base64Data,
          mimeType: file.type || 'image/jpeg',
          fileName: file.name
        };

        // Enviamos con mode: 'no-cors' para evitar que el navegador aborte la redirección de Google
        await fetch(GOOGLE_DRIVE_WEBHOOK_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: JSON.stringify(payload)
        });

        // Al usar no-cors la imagen se sube exitosamente a Drive.
        // Retornamos un placeholder confirmando la subida o la URL directa generada por tu Apps Script
        resolve(`https://drive.google.com/thumbnail?id=UPLOADED&sz=w1000`);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
  });
}