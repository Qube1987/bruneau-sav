import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SavRequest, SYSTEM_TYPES, Intervention, InterventionPhoto } from '../types';

const formatDate = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC'
  });
};

const formatDateShort = (dateString: string | undefined) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC'
  });
};

const getSystemTypeLabel = (type: string) => {
  switch (type) {
    case 'ssi': return 'Alarme incendie type SSI';
    case 'type4': return 'Alarme évacuation type 4';
    case 'intrusion': return 'Alarme intrusion';
    case 'video': return 'Vidéosurveillance';
    case 'controle_acces': return 'Contrôle d\'accès';
    case 'interphone': return 'Interphone';
    case 'portail': return 'Portail';
    case 'autre': return 'Autre';
    default: return type;
  }
};

const loadImageAsBase64 = async (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          resolve(base64);
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

const loadImageWithDimensions = async (url: string): Promise<{ base64: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const base64 = canvas.toDataURL('image/png');
          resolve({ base64, width: img.width, height: img.height });
        } else {
          reject(new Error('Failed to get canvas context'));
        }
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
};

// Helper function to add photos section to PDF
const addPhotosSection = async (
  doc: jsPDF,
  photos: InterventionPhoto[],
  yPos: number,
  pageWidth: number,
  pageHeight: number,
  margin: number
): Promise<number> => {
  // Filter only photos marked for PDF inclusion
  console.log('All photos:', photos.length, photos.map(p => ({ name: p.file_name, include: p.include_in_pdf })));
  const photosToInclude = photos.filter(photo => photo.include_in_pdf);
  console.log('Photos to include:', photosToInclude.length);

  if (photosToInclude.length === 0) {
    return yPos;
  }

  // Check if we need a new page for the photos section
  if (yPos + 40 > pageHeight - margin) {
    doc.addPage();
    yPos = margin;
  }

  // Bandeau de titre rose
  doc.setDrawColor(41, 35, 92);
  doc.setFillColor(233, 30, 99);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('barlow', 'bold');
  doc.text(`Photos de l'intervention (${photosToInclude.length})`, margin + 2, yPos + 5.5);

  yPos += 15;

  // Load and add photos
  const photosPerRow = 2;
  const photoSpacing = 5;
  const availableWidth = pageWidth - 2 * margin - photoSpacing;
  const photoWidth = availableWidth / photosPerRow - photoSpacing;

  for (let i = 0; i < photosToInclude.length; i++) {
    const photo = photosToInclude[i];

    try {
      const photoData = await loadImageWithDimensions(photo.url || '');

      // Calculate photo dimensions maintaining aspect ratio
      const aspectRatio = photoData.width / photoData.height;
      const photoHeight = photoWidth / aspectRatio;

      // Check if we need a new page
      if (yPos + photoHeight + 10 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
      }

      // Calculate position (2 photos per row)
      const col = i % photosPerRow;
      const xPos = margin + col * (photoWidth + photoSpacing);

      // Add photo
      doc.addImage(
        photoData.base64,
        'PNG',
        xPos,
        yPos,
        photoWidth,
        photoHeight
      );

      // Add photo caption
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.setFont('barlow', 'normal');
      const caption = photo.file_name;
      const captionLines = doc.splitTextToSize(caption, photoWidth);
      doc.text(captionLines[0], xPos, yPos + photoHeight + 3);

      // Move to next row after 2 photos
      if (col === photosPerRow - 1 || i === photosToInclude.length - 1) {
        yPos += photoHeight + 8;
      }
    } catch (error) {
      console.warn(`Failed to load photo ${photo.file_name}:`, error);
      // Continue with next photo
    }
  }

  return yPos;
};

// Fonction principale de génération du PDF d'intervention
export const generateInterventionPDF = async (request: SavRequest) => {
  // Initialise le document PDF au format A4
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10; // Marge de 10mm
  let yPos = margin; // Position verticale courante

  // === EN-TÊTE DU DOCUMENT ===
  try {
  const headerBase64 = await loadImageAsBase64('/image_copy.png');

  // Largeur identique aux autres blocs
  const headerWidth = pageWidth - 2 * margin;

  // Ratio de l'image (inchangé)
  const aspectRatio = 1488 / 280;
  const headerHeight = headerWidth / aspectRatio;

  // Padding de l'image dans le cadre
  const HEADER_PADDING = 1.5; // mm - petit, discret, suffisant

  // 1️⃣ Cadre vectoriel (même style que les autres blocs)
  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(
    margin,
    yPos,
    headerWidth,
    headerHeight
  );

  // 2️⃣ Image SANS bordure, exactement dans le cadre
  doc.addImage(
    headerBase64,
    'PNG',
    margin + HEADER_PADDING,
    yPos + HEADER_PADDING,
    headerWidth - 2 * HEADER_PADDING,
    headerHeight - 2 * HEADER_PADDING
  );

  // 3️⃣ Décalage vertical après l'en-tête
  yPos += headerHeight + 5;

} catch (error) {
  console.warn('Failed to load header:', error);

  // Fallback propre si l'image ne charge pas
  const fallbackHeight = 20;

  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(
    margin,
    yPos,
    pageWidth - 2 * margin,
    fallbackHeight
  );

  doc.setFontSize(18);
  doc.setFont('barlow', 'bold');
  doc.text(
    'RAPPORT D\'INTERVENTION',
    pageWidth / 2,
    yPos + 13,
    { align: 'center' }
  );

  yPos += fallbackHeight + 5;
}

  // === SECTION 1 : INFORMATIONS GÉNÉRALES ===
  const sectionStartY = yPos;

  // Bandeau de titre rose
  doc.setDrawColor(41, 35, 92);
  doc.setFillColor(233, 30, 99); // Rose Bruneau
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD'); // FD = Fill + Draw (remplissage + bordure)
  doc.setTextColor(255, 255, 255); // Texte blanc
  doc.setFontSize(14);
  doc.setFont('barlow', 'bold');
  doc.text('Informations générales', margin + 2, yPos + 5.5);

  yPos += 15;
  doc.setTextColor(0, 0, 0); // Texte noir
  doc.setFontSize(12);

  // Informations client
  doc.setFont('barlow', 'bold');
  doc.text('Client :', margin + 2, yPos);

  doc.setFont('barlow', 'normal');
  doc.text(`Nom : ${request.client_name || 'N/A'}`, margin + 20, yPos);
  yPos += 5;

  // Gestion de l'adresse sur plusieurs lignes
  const addressLabel = 'Adresse : ';
  const addressText = request.address || 'N/A';
  const maxAddressWidth = pageWidth - 2 * margin - 24;
  const addressLines = doc.splitTextToSize(addressText, maxAddressWidth);

  doc.text(addressLabel, margin + 20, yPos);
  doc.text(addressLines[0], margin + 20 + doc.getTextWidth(addressLabel), yPos);
  yPos += 5;

  for (let i = 1; i < addressLines.length; i++) {
    doc.text(addressLines[i], margin + 20, yPos);
    yPos += 5;
  }

  yPos += 2;

  if (request.interventions && request.interventions.length > 0) {
    const firstIntervention = request.interventions[0];
    doc.setFont('barlow', 'bold');
    doc.text('Date et Heure de l\'intervention :', margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(formatDate(firstIntervention.started_at), margin + 65, yPos);
    yPos += 5;

    if (firstIntervention.technicians && firstIntervention.technicians.length > 0) {
      const techNames = firstIntervention.technicians.map((tech: any) => tech.display_name || tech.email).join(', ');
      doc.setFont('barlow', 'bold');
      doc.text('Technicien(s) en charge de l\'intervention :', margin + 2, yPos);
      doc.setFont('barlow', 'normal');
      doc.text(techNames, margin + 80, yPos);
    } else if (firstIntervention.technician) {
      doc.setFont('barlow', 'bold');
      doc.text('Technicien en charge de l\'intervention :', margin + 2, yPos);
      doc.setFont('barlow', 'normal');
      doc.text(firstIntervention.technician.display_name || firstIntervention.technician.email, margin + 75, yPos);
    }
    yPos += 7;
  }

  if (request.system_type) {
    doc.setFont('barlow', 'bold');
    doc.text('Type de système :', margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(getSystemTypeLabel(request.system_type), margin + 40, yPos);
    yPos += 5;
  }

  if (request.system_brand || request.system_model) {
    const brandModel = `${request.system_brand || 'N/A'}${request.system_model ? ' - ' + request.system_model : ''}`;
    doc.setFont('barlow', 'bold');
    doc.text('Marque/Modèle :', margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(brandModel, margin + 40, yPos);
    yPos += 5;
  }

  yPos += 2;

  // Cadre englobant toute la section Informations générales
  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(margin, sectionStartY, pageWidth - 2 * margin, yPos - sectionStartY);

  yPos += 5;

  // === SECTION 2 : RAPPORT D'INTERVENTION ===
  const reportStartY = yPos;

  // Bandeau de titre rose
  doc.setDrawColor(41, 35, 92);
  doc.setFillColor(233, 30, 99); // Rose Bruneau
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
  doc.setTextColor(255, 255, 255); // Texte blanc
  doc.setFontSize(14);
  doc.setFont('barlow', 'bold');
  doc.text('Rapport d\'intervention', margin + 2, yPos + 5.5);

  yPos += 15;
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(12);
  doc.setFont('barlow', 'bold');
  doc.text('Motif de l\'intervention :', margin + 2, yPos);
  yPos += 5;

  doc.setFontSize(11);
  doc.setFont('barlow', 'normal');
  const problemLines = doc.splitTextToSize(request.problem_desc, pageWidth - 2 * margin - 4);
  problemLines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin + 2, yPos);
    yPos += 4;
  });

  yPos += 3;

  if (request.interventions && request.interventions.length > 0) {
    request.interventions.forEach((intervention) => {
      const rapport = intervention.rapport_reformule || intervention.rapport_brut;
      if (rapport) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }

        const rapportSectionStartY = yPos;

        // Prépare le texte du rapport en le découpant pour qu'il rentre dans la largeur de page
        doc.setFontSize(11);
        doc.setFont('barlow', 'normal');
        const rapportLines = doc.splitTextToSize(rapport, pageWidth - 2 * margin - 4);

        // Calcule la hauteur totale de l'encadré (titre + lignes de texte + marges)
        const rapportSectionHeight = 5 + (rapportLines.length * 4) + 3;

        // 🎨 ENCADRÉ DE FOND : lignes 297-299
        // Configure l'opacité à 8% pour un effet très léger
        doc.setGState(new doc.GState({ opacity: 0.08 }));
        // Utilise la couleur principale (bleu foncé Bruneau)
        doc.setFillColor(41, 35, 92);
        // Dessine le rectangle de fond :
        // - X: margin (aligné à gauche)
        // - Y: rapportSectionStartY - 3 (commence 3mm au-dessus du titre)
        // - Largeur: pleine largeur (pageWidth - 2 * margin)
        // - Hauteur: calculée selon le contenu
        // - 'F' = Fill (remplissage uniquement, pas de bordure)
        doc.rect(margin, rapportSectionStartY - 5, pageWidth - 2 * margin, rapportSectionHeight, 'F');

        // Réinitialise l'opacité à 100% pour le texte
        doc.setGState(new doc.GState({ opacity: 1 }));

        // Affiche le titre "Rapport :"
        doc.setFontSize(12);
        doc.setFont('barlow', 'bold');
        doc.text('Rapport :', margin + 2, yPos);
        yPos += 5;

        // Affiche chaque ligne du rapport
        doc.setFontSize(11);
        doc.setFont('barlow', 'normal');

        rapportLines.forEach((line: string) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line, margin + 2, yPos);
          yPos += 4;
        });

        yPos += 5;
      }

      if (intervention.started_at && intervention.ended_at) {
        const start = new Date(intervention.started_at);
        const end = new Date(intervention.ended_at);
        const durationMs = end.getTime() - start.getTime();
        const durationHours = Math.round(durationMs / (1000 * 60 * 60) * 10) / 10;

        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(12);
        doc.setFont('barlow', 'bold');
        doc.text(`Durée de l'intervention : `, margin + 2, yPos);
        doc.setFont('barlow', 'normal');
        doc.text(`${durationHours} heure${durationHours > 1 ? 's' : ''}`, margin + 52, yPos);
        yPos += 10;
      }
    });
  }

  if (request.observations) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    doc.setFont('barlow', 'bold');
    doc.text('Observations :', margin + 2, yPos);
    yPos += 5;

    doc.setFontSize(11);
    doc.setFont('barlow', 'normal');
    const obsLines = doc.splitTextToSize(request.observations, pageWidth - 2 * margin - 4);
    obsLines.forEach((line: string) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin + 2, yPos);
      yPos += 4;
    });
    yPos += 5;
  }

  yPos += 2;

  // Cadre englobant toute la section Rapport d'intervention
  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(margin, reportStartY, pageWidth - 2 * margin, yPos - reportStartY);

  yPos += 5;

  // === SECTION 3 : FEEDBACK CLIENT (QR CODE) ===
  const qrBlockHeight = 80;
  // Vérifie si on a assez de place, sinon nouvelle page
  if (yPos + qrBlockHeight > pageHeight - margin) {
    doc.addPage();
    yPos = margin;
  }

  const feedbackStartY = yPos;

  // Bandeau de titre rose
  doc.setDrawColor(41, 35, 92);
  doc.setFillColor(233, 30, 99); // Rose Bruneau
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
  doc.setTextColor(255, 255, 255); // Texte blanc
  doc.setFontSize(14);
  doc.setFont('barlow', 'bold');
  doc.text('Votre avis nous est (très) précieux', margin + 2, yPos + 5.5);

  yPos += 13;

  try {
    const qrImage = await loadImageWithDimensions('/qr_codes_avis.png');

    const pixelsToMm = 0.264583;
    const qrImageWidth = qrImage.width * pixelsToMm;
    const qrImageHeight = qrImage.height * pixelsToMm;

    const maxWidth = pageWidth - 2 * margin - 4;
    let finalWidth = qrImageWidth;
    let finalHeight = qrImageHeight;

    if (finalWidth > maxWidth) {
      const scale = maxWidth / finalWidth;
      finalWidth = maxWidth;
      finalHeight = finalHeight * scale;
    }

    const centerX = (pageWidth - finalWidth) / 2;

    doc.addImage(
      qrImage.base64,
      'PNG',
      centerX,
      yPos,
      finalWidth,
      finalHeight
    );

    yPos += finalHeight + 5;
  } catch (error) {
    console.warn('Failed to load QR code image:', error);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('barlow', 'normal');
    doc.text('Image QR code non disponible', pageWidth / 2, yPos + 10, { align: 'center' });
    yPos += 20;
  }

  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(margin, feedbackStartY, pageWidth - 2 * margin, yPos - feedbackStartY);

  // === SECTION 4 : PHOTOS D'INTERVENTION ===
  // Photos always on a new page after QR codes
  if (request.interventions && request.interventions.length > 0) {
    const allPhotos = request.interventions.flatMap(i => i.photos || []);
    if (allPhotos.filter(p => p.include_in_pdf).length > 0) {
      doc.addPage();
      yPos = margin;
      yPos = await addPhotosSection(doc, allPhotos, yPos, pageWidth, pageHeight, margin);
    }
  }

  const fileName = `Rapport_${request.client_name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Fonction pour générer le PDF en tant que Blob (pour envoi par email)
export const generateInterventionPDFBlob = async (request: SavRequest): Promise<Blob> => {
  // Initialise le document PDF au format A4
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let yPos = margin;

  // === EN-TÊTE DU DOCUMENT ===
  try {
  const headerBase64 = await loadImageAsBase64('/image_copy.png');

  const headerWidth = pageWidth - 2 * margin;
  const aspectRatio = 1488 / 280;
  const headerHeight = headerWidth / aspectRatio;

  const HEADER_PADDING = 1.5;

  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(
    margin,
    yPos,
    headerWidth,
    headerHeight
  );

  doc.addImage(
    headerBase64,
    'PNG',
    margin + HEADER_PADDING,
    yPos + HEADER_PADDING,
    headerWidth - 2 * HEADER_PADDING,
    headerHeight - 2 * HEADER_PADDING
  );

  yPos += headerHeight + 5;

} catch (error) {
  console.warn('Failed to load header:', error);

  const fallbackHeight = 20;

  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(
    margin,
    yPos,
    pageWidth - 2 * margin,
    fallbackHeight
  );

  doc.setFontSize(18);
  doc.setFont('barlow', 'bold');
  doc.text(
    'RAPPORT D\'INTERVENTION',
    pageWidth / 2,
    yPos + 13,
    { align: 'center' }
  );

  yPos += fallbackHeight + 5;
}

  // === SECTION 1 : INFORMATIONS GÉNÉRALES ===
  const sectionStartY = yPos;

  doc.setDrawColor(41, 35, 92);
  doc.setFillColor(233, 30, 99);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('barlow', 'bold');
  doc.text('Informations générales', margin + 2, yPos + 5.5);

  yPos += 15;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);

  doc.setFont('barlow', 'bold');
  doc.text('Client :', margin + 2, yPos);

  doc.setFont('barlow', 'normal');
  doc.text(`Nom : ${request.client_name || 'N/A'}`, margin + 20, yPos);
  yPos += 5;

  // Gestion de l'adresse sur plusieurs lignes
  let addressLabel = 'Adresse : ';
  let addressText = request.address || 'N/A';
  let maxAddressWidth = pageWidth - 2 * margin - 24;
  let addressLines = doc.splitTextToSize(addressText, maxAddressWidth);

  doc.text(addressLabel, margin + 20, yPos);
  doc.text(addressLines[0], margin + 20 + doc.getTextWidth(addressLabel), yPos);
  yPos += 5;

  for (let i = 1; i < addressLines.length; i++) {
    doc.text(addressLines[i], margin + 20, yPos);
    yPos += 5;
  }

  yPos += 2;

  if (request.interventions && request.interventions.length > 0) {
    const firstIntervention = request.interventions[0];
    doc.setFont('barlow', 'bold');
    doc.text('Date et Heure de l\'intervention :', margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(formatDate(firstIntervention.started_at), margin + 65, yPos);
    yPos += 5;

    if (firstIntervention.technicians && firstIntervention.technicians.length > 0) {
      const techNames = firstIntervention.technicians.map((tech: any) => tech.display_name || tech.email).join(', ');
      doc.setFont('barlow', 'bold');
      doc.text('Technicien(s) en charge de l\'intervention :', margin + 2, yPos);
      doc.setFont('barlow', 'normal');
      doc.text(techNames, margin + 80, yPos);
    } else if (firstIntervention.technician) {
      doc.setFont('barlow', 'bold');
      doc.text('Technicien en charge de l\'intervention :', margin + 2, yPos);
      doc.setFont('barlow', 'normal');
      doc.text(firstIntervention.technician.display_name || firstIntervention.technician.email, margin + 75, yPos);
    }
    yPos += 7;
  }

  if (request.system_type) {
    doc.setFont('barlow', 'bold');
    doc.text('Type de système :', margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(getSystemTypeLabel(request.system_type), margin + 40, yPos);
    yPos += 5;
  }

  if (request.system_brand || request.system_model) {
    const brandModel = `${request.system_brand || 'N/A'}${request.system_model ? ' - ' + request.system_model : ''}`;
    doc.setFont('barlow', 'bold');
    doc.text('Marque/Modèle :', margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(brandModel, margin + 40, yPos);
    yPos += 5;
  }

  yPos += 2;

  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(margin, sectionStartY, pageWidth - 2 * margin, yPos - sectionStartY);

  yPos += 5;

  // === SECTION 2 : RAPPORT D'INTERVENTION ===
  const reportStartY = yPos;

  doc.setDrawColor(41, 35, 92);
  doc.setFillColor(233, 30, 99);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('barlow', 'bold');
  doc.text('Rapport d\'intervention', margin + 2, yPos + 5.5);

  yPos += 15;
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(12);
  doc.setFont('barlow', 'bold');
  doc.text('Motif de l\'intervention :', margin + 2, yPos);
  yPos += 5;

  doc.setFontSize(11);
  doc.setFont('barlow', 'normal');
  const problemLines = doc.splitTextToSize(request.problem_desc, pageWidth - 2 * margin - 4);
  problemLines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin + 2, yPos);
    yPos += 4;
  });

  yPos += 3;

  if (request.interventions && request.interventions.length > 0) {
    request.interventions.forEach((intervention) => {
      const rapport = intervention.rapport_reformule || intervention.rapport_brut;
      if (rapport) {
        if (yPos > pageHeight - 40) {
          doc.addPage();
          yPos = margin;
        }

        const rapportSectionStartY = yPos;

        doc.setFontSize(11);
        doc.setFont('barlow', 'normal');
        const rapportLines = doc.splitTextToSize(rapport, pageWidth - 2 * margin - 4);
        const rapportSectionHeight = 5 + (rapportLines.length * 4) + 3;

        doc.setGState(new doc.GState({ opacity: 0.08 }));
        doc.setFillColor(41, 35, 92);
        doc.rect(margin, rapportSectionStartY - 5, pageWidth - 2 * margin, rapportSectionHeight, 'F');

        doc.setGState(new doc.GState({ opacity: 1 }));

        doc.setFontSize(12);
        doc.setFont('barlow', 'bold');
        doc.text('Rapport :', margin + 2, yPos);
        yPos += 5;

        doc.setFontSize(11);
        doc.setFont('barlow', 'normal');

        rapportLines.forEach((line: string) => {
          if (yPos > pageHeight - 30) {
            doc.addPage();
            yPos = margin;
          }
          doc.text(line, margin + 2, yPos);
          yPos += 4;
        });

        yPos += 5;
      }

      if (intervention.started_at && intervention.ended_at) {
        const start = new Date(intervention.started_at);
        const end = new Date(intervention.ended_at);
        const durationMs = end.getTime() - start.getTime();
        const durationHours = Math.round(durationMs / (1000 * 60 * 60) * 10) / 10;

        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = margin;
        }

        doc.setFontSize(12);
        doc.setFont('barlow', 'bold');
        doc.text(`Durée de l'intervention : `, margin + 2, yPos);
        doc.setFont('barlow', 'normal');
        doc.text(`${durationHours} heure${durationHours > 1 ? 's' : ''}`, margin + 52, yPos);
        yPos += 10;
      }
    });
  }

  if (request.observations) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    doc.setFont('barlow', 'bold');
    doc.text('Observations :', margin + 2, yPos);
    yPos += 5;

    doc.setFontSize(11);
    doc.setFont('barlow', 'normal');
    const obsLines = doc.splitTextToSize(request.observations, pageWidth - 2 * margin - 4);
    obsLines.forEach((line: string) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin + 2, yPos);
      yPos += 4;
    });
    yPos += 5;
  }

  yPos += 2;

  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(margin, reportStartY, pageWidth - 2 * margin, yPos - reportStartY);

  yPos += 5;

  // === SECTION 3 : FEEDBACK CLIENT (QR CODE) ===
  const qrBlockHeight = 80;
  if (yPos + qrBlockHeight > pageHeight - margin) {
    doc.addPage();
    yPos = margin;
  }

  const feedbackStartY = yPos;

  doc.setDrawColor(41, 35, 92);
  doc.setFillColor(233, 30, 99);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('barlow', 'bold');
  doc.text('Votre avis nous est (très) précieux', margin + 2, yPos + 5.5);

  yPos += 13;

  try {
    const qrImage = await loadImageWithDimensions('/qr_codes_avis.png');

    const pixelsToMm = 0.264583;
    const qrImageWidth = qrImage.width * pixelsToMm;
    const qrImageHeight = qrImage.height * pixelsToMm;

    const maxWidth = pageWidth - 2 * margin - 4;
    let finalWidth = qrImageWidth;
    let finalHeight = qrImageHeight;

    if (finalWidth > maxWidth) {
      const scale = maxWidth / finalWidth;
      finalWidth = maxWidth;
      finalHeight = finalHeight * scale;
    }

    const centerX = (pageWidth - finalWidth) / 2;

    doc.addImage(
      qrImage.base64,
      'PNG',
      centerX,
      yPos,
      finalWidth,
      finalHeight
    );

    yPos += finalHeight + 5;
  } catch (error) {
    console.warn('Failed to load QR code image:', error);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('barlow', 'normal');
    doc.text('Image QR code non disponible', pageWidth / 2, yPos + 10, { align: 'center' });
    yPos += 20;
  }

  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(margin, feedbackStartY, pageWidth - 2 * margin, yPos - feedbackStartY);

  // === SECTION 4 : PHOTOS D'INTERVENTION ===
  // Photos always on a new page after QR codes
  if (request.interventions && request.interventions.length > 0) {
    const allPhotos = request.interventions.flatMap(i => i.photos || []);
    if (allPhotos.filter(p => p.include_in_pdf).length > 0) {
      doc.addPage();
      yPos = margin;
      yPos = await addPhotosSection(doc, allPhotos, yPos, pageWidth, pageHeight, margin);
    }
  }

  return doc.output('blob');
};

// Fonction pour générer le PDF d'une seule intervention
export const generateSingleInterventionPDFBlob = async (
  request: SavRequest,
  interventionId: string
): Promise<Blob> => {
  const intervention = request.interventions?.find(i => i.id === interventionId);
  if (!intervention) {
    throw new Error('Intervention not found');
  }

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  let yPos = margin;

  // === EN-TÊTE DU DOCUMENT ===
  try {
    const headerBase64 = await loadImageAsBase64('/image_copy.png');
    const headerWidth = pageWidth - 2 * margin;
    const aspectRatio = 1488 / 280;
    const headerHeight = headerWidth / aspectRatio;
    const HEADER_PADDING = 1.5;

    doc.setDrawColor(41, 35, 92);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, headerWidth, headerHeight);

    doc.addImage(
      headerBase64,
      'PNG',
      margin + HEADER_PADDING,
      yPos + HEADER_PADDING,
      headerWidth - 2 * HEADER_PADDING,
      headerHeight - 2 * HEADER_PADDING
    );

    yPos += headerHeight + 5;
  } catch (error) {
    console.warn('Failed to load header:', error);
    const fallbackHeight = 20;

    doc.setDrawColor(41, 35, 92);
    doc.setLineWidth(0.3);
    doc.rect(margin, yPos, pageWidth - 2 * margin, fallbackHeight);

    doc.setFontSize(18);
    doc.setFont('barlow', 'bold');
    doc.text('RAPPORT D\'INTERVENTION', pageWidth / 2, yPos + 13, { align: 'center' });

    yPos += fallbackHeight + 5;
  }

  // === SECTION 1 : INFORMATIONS GÉNÉRALES ===
  const sectionStartY = yPos;

  doc.setDrawColor(41, 35, 92);
  doc.setFillColor(233, 30, 99);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('barlow', 'bold');
  doc.text('Informations générales', margin + 2, yPos + 5.5);

  yPos += 15;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);

  doc.setFont('barlow', 'bold');
  doc.text('Client :', margin + 2, yPos);

  doc.setFont('barlow', 'normal');
  doc.text(`Nom : ${request.client_name || 'N/A'}`, margin + 20, yPos);
  yPos += 5;

  // Gestion de l'adresse sur plusieurs lignes
  const addressLabel = 'Adresse : ';
  const addressText = request.address || 'N/A';
  const maxAddressWidth = pageWidth - 2 * margin - 24;
  const addressLines = doc.splitTextToSize(addressText, maxAddressWidth);

  doc.text(addressLabel, margin + 20, yPos);
  doc.text(addressLines[0], margin + 20 + doc.getTextWidth(addressLabel), yPos);
  yPos += 5;

  for (let i = 1; i < addressLines.length; i++) {
    doc.text(addressLines[i], margin + 20, yPos);
    yPos += 5;
  }

  yPos += 2;

  doc.setFont('barlow', 'bold');
  doc.text('Date et Heure de l\'intervention :', margin + 2, yPos);
  doc.setFont('barlow', 'normal');
  doc.text(formatDate(intervention.started_at), margin + 65, yPos);
  yPos += 5;

  if (intervention.technicians && intervention.technicians.length > 0) {
    const techNames = intervention.technicians.map((tech: any) => tech.display_name || tech.email).join(', ');
    doc.setFont('barlow', 'bold');
    doc.text('Technicien(s) en charge de l\'intervention :', margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(techNames, margin + 80, yPos);
  } else if (intervention.technician) {
    doc.setFont('barlow', 'bold');
    doc.text('Technicien en charge de l\'intervention :', margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(intervention.technician.display_name || intervention.technician.email, margin + 75, yPos);
  }
  yPos += 7;

  if (request.system_type) {
    doc.setFont('barlow', 'bold');
    doc.text('Type de système :', margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(getSystemTypeLabel(request.system_type), margin + 40, yPos);
    yPos += 5;
  }

  if (request.system_brand || request.system_model) {
    const brandModel = `${request.system_brand || 'N/A'}${request.system_model ? ' - ' + request.system_model : ''}`;
    doc.setFont('barlow', 'bold');
    doc.text('Marque/Modèle :', margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(brandModel, margin + 40, yPos);
    yPos += 5;
  }

  yPos += 2;

  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(margin, sectionStartY, pageWidth - 2 * margin, yPos - sectionStartY);

  yPos += 5;

  // === SECTION 2 : RAPPORT D'INTERVENTION ===
  const reportStartY = yPos;

  doc.setDrawColor(41, 35, 92);
  doc.setFillColor(233, 30, 99);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('barlow', 'bold');
  doc.text('Rapport d\'intervention', margin + 2, yPos + 5.5);

  yPos += 15;
  doc.setTextColor(0, 0, 0);

  doc.setFontSize(12);
  doc.setFont('barlow', 'bold');
  doc.text('Motif de l\'intervention :', margin + 2, yPos);
  yPos += 5;

  doc.setFontSize(11);
  doc.setFont('barlow', 'normal');
  const problemLines = doc.splitTextToSize(request.problem_desc, pageWidth - 2 * margin - 4);
  problemLines.forEach((line: string) => {
    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }
    doc.text(line, margin + 2, yPos);
    yPos += 4;
  });

  yPos += 3;

  const rapport = intervention.rapport_reformule || intervention.rapport_brut;
  if (rapport) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    const rapportSectionStartY = yPos;

    doc.setFontSize(11);
    doc.setFont('barlow', 'normal');
    const rapportLines = doc.splitTextToSize(rapport, pageWidth - 2 * margin - 4);
    const rapportSectionHeight = 5 + (rapportLines.length * 4) + 3;

    doc.setGState(new doc.GState({ opacity: 0.08 }));
    doc.setFillColor(41, 35, 92);
    doc.rect(margin, rapportSectionStartY - 5, pageWidth - 2 * margin, rapportSectionHeight, 'F');

    doc.setGState(new doc.GState({ opacity: 1 }));

    doc.setFontSize(12);
    doc.setFont('barlow', 'bold');
    doc.text('Rapport :', margin + 2, yPos);
    yPos += 5;

    doc.setFontSize(11);
    doc.setFont('barlow', 'normal');

    rapportLines.forEach((line: string) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin + 2, yPos);
      yPos += 4;
    });

    yPos += 5;
  }

  if (intervention.started_at && intervention.ended_at) {
    const start = new Date(intervention.started_at);
    const end = new Date(intervention.ended_at);
    const durationMs = end.getTime() - start.getTime();
    const durationHours = Math.round(durationMs / (1000 * 60 * 60) * 10) / 10;

    if (yPos > pageHeight - 30) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    doc.setFont('barlow', 'bold');
    doc.text(`Durée de l'intervention : `, margin + 2, yPos);
    doc.setFont('barlow', 'normal');
    doc.text(`${durationHours} heure${durationHours > 1 ? 's' : ''}`, margin + 52, yPos);
    yPos += 10;
  }

  if (request.observations) {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = margin;
    }

    doc.setFontSize(12);
    doc.setFont('barlow', 'bold');
    doc.text('Observations :', margin + 2, yPos);
    yPos += 5;

    doc.setFontSize(11);
    doc.setFont('barlow', 'normal');
    const obsLines = doc.splitTextToSize(request.observations, pageWidth - 2 * margin - 4);
    obsLines.forEach((line: string) => {
      if (yPos > pageHeight - 30) {
        doc.addPage();
        yPos = margin;
      }
      doc.text(line, margin + 2, yPos);
      yPos += 4;
    });
    yPos += 5;
  }

  yPos += 2;

  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(margin, reportStartY, pageWidth - 2 * margin, yPos - reportStartY);

  yPos += 5;

  // === SECTION 3 : FEEDBACK CLIENT (QR CODE) ===
  const qrBlockHeight = 80;
  if (yPos + qrBlockHeight > pageHeight - margin) {
    doc.addPage();
    yPos = margin;
  }

  const feedbackStartY = yPos;

  doc.setDrawColor(41, 35, 92);
  doc.setFillColor(233, 30, 99);
  doc.setLineWidth(0.3);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('barlow', 'bold');
  doc.text('Votre avis nous est (très) précieux', margin + 2, yPos + 5.5);

  yPos += 13;

  try {
    const qrImage = await loadImageWithDimensions('/qr_codes_avis.png');

    const pixelsToMm = 0.264583;
    const qrImageWidth = qrImage.width * pixelsToMm;
    const qrImageHeight = qrImage.height * pixelsToMm;

    const maxWidth = pageWidth - 2 * margin - 4;
    let finalWidth = qrImageWidth;
    let finalHeight = qrImageHeight;

    if (finalWidth > maxWidth) {
      const scale = maxWidth / finalWidth;
      finalWidth = maxWidth;
      finalHeight = finalHeight * scale;
    }

    const centerX = (pageWidth - finalWidth) / 2;

    doc.addImage(
      qrImage.base64,
      'PNG',
      centerX,
      yPos,
      finalWidth,
      finalHeight
    );

    yPos += finalHeight + 5;
  } catch (error) {
    console.warn('Failed to load QR code image:', error);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('barlow', 'normal');
    doc.text('Image QR code non disponible', pageWidth / 2, yPos + 10, { align: 'center' });
    yPos += 20;
  }

  doc.setDrawColor(41, 35, 92);
  doc.setLineWidth(0.3);
  doc.rect(margin, feedbackStartY, pageWidth - 2 * margin, yPos - feedbackStartY);

  // === SECTION 4 : PHOTOS D'INTERVENTION ===
  // Photos always on a new page after QR codes
  if (intervention.photos && intervention.photos.length > 0) {
    const photosToInclude = intervention.photos.filter(p => p.include_in_pdf);
    if (photosToInclude.length > 0) {
      doc.addPage();
      yPos = margin;
      yPos = await addPhotosSection(doc, intervention.photos, yPos, pageWidth, pageHeight, margin);
    }
  }

  return doc.output('blob');
};
