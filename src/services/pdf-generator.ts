/**
 * PDF Generator for MTG Proxy Cards
 * 
 * Generates print-ready PDFs with exact dimensions:
 * - Card size: 63mm × 88mm (with 1mm black border = 65mm × 90mm total)
 * - Page size: A4 (210mm × 297mm)
 * - Layout: 3×3 grid (9 cards per page)
 * - Cutting lines positioned 1mm inward to cut THROUGH the black border
 *   (ensures cards have no white edges after cutting)
 */

import jsPDF from 'jspdf';
import { domToPng, waitUntilLoad } from 'modern-screenshot';

// Card dimensions in mm (must match CSS variables)
const CARD_CONTENT_WIDTH = 63;
const CARD_BLEED = 1;
const CARD_MARGIN = 1;
const CARD_TOTAL_WIDTH = CARD_CONTENT_WIDTH + 2 * CARD_BLEED; // 65mm
const CARD_TOTAL_HEIGHT = 88 + 2 * CARD_BLEED; // 90mm

// A4 page dimensions in mm
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

// Grid dimensions
const GRID_WIDTH = CARD_TOTAL_WIDTH * 3 + CARD_MARGIN * 2; // 197mm
const GRID_HEIGHT = CARD_TOTAL_HEIGHT * 3 + CARD_MARGIN * 2; // 272mm

// Grid offset (centering on page)
const GRID_LEFT_OFFSET = (PAGE_WIDTH - GRID_WIDTH) / 2; // 6.5mm
const GRID_TOP_OFFSET = (PAGE_HEIGHT - GRID_HEIGHT) / 2; // 12.5mm

// Scale factor for high-resolution output (3x = ~300 DPI equivalent)
const RENDER_SCALE = 3;

// Debug mode - set to true to preview rendered images before PDF
const DEBUG_MODE = false;

// CSS variables that need to be inlined for cloned elements
const CSS_VARS = {
  '--card-width': '63mm',
  '--card-bleed': '1mm',
  '--card-margin': '1mm',
  '--card-bgc': '#161410',
};

/**
 * Generates a PDF with all cards in a 3×3 grid layout
 * @param printVersos - Whether to include card backs on reverse pages
 */
export async function generateCardsPDF(printVersos: boolean = false): Promise<void> {
  try {
    // Find the card grid
    const cardGrid = document.querySelector('.card-grid') as HTMLElement;
    
    if (!cardGrid) {
      throw new Error('No cards found to print');
    }

    // Get all cards using the mtg-card class
    const allCards = Array.from(cardGrid.querySelectorAll('.mtg-card')) as HTMLElement[];
    
    if (allCards.length === 0) {
      throw new Error('No cards found to print');
    }

    // Calculate number of pages
    const pageCount = Math.ceil(allCards.length / 9);

    // Create PDF with exact A4 dimensions
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    // Process each page (9 cards per page)
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      // Add new page (except for first page)
      if (pageIndex > 0) {
        pdf.addPage('a4', 'portrait');
      }

      // Get cards for this page (9 cards max)
      const startIdx = pageIndex * 9;
      const endIdx = Math.min(startIdx + 9, allCards.length);
      const pageCards = allCards.slice(startIdx, endIdx);

      // Render cards for this page
      await renderCardsToPage(pdf, pageCards, pageIndex);

      // Add cutting lines
      addCuttingLines(pdf);
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `mtg-proxies-${timestamp}.pdf`;

    // Save PDF
    pdf.save(filename);

    console.log(`PDF generated successfully: ${filename}`);
  } catch (error) {
    console.error('Error generating PDF:', error);
    // Log detailed error info if available
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    alert('Failed to generate PDF. Check console for details.');
  }
}

/**
 * Renders a set of cards (up to 9) to the current PDF page
 * Uses modern-screenshot for better CSS compatibility (supports oklch, etc.)
 */
async function renderCardsToPage(
  pdf: jsPDF,
  cards: HTMLElement[],
  pageIndex: number = 0
): Promise<void> {
  // Create a temporary container for this page's cards
  // Must be visible and on-screen for modern-screenshot to work properly
  const tempContainer = document.createElement('div');
  
  // Apply CSS variables directly to the container (they don't inherit to cloned elements)
  const cssVarsStyle = Object.entries(CSS_VARS)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
  
  tempContainer.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    width: ${GRID_WIDTH}mm;
    height: ${GRID_HEIGHT}mm;
    display: grid;
    grid-template-columns: repeat(3, ${CARD_TOTAL_WIDTH}mm);
    grid-template-rows: repeat(3, ${CARD_TOTAL_HEIGHT}mm);
    gap: ${CARD_MARGIN}mm;
    background: white;
    z-index: 99999;
    ${cssVarsStyle};
  `;

  console.log(`Rendering ${cards.length} cards to PDF page ${pageIndex + 1}...`);

  // Clone and add cards to temp container
  for (const card of cards) {
    const clone = card.cloneNode(true) as HTMLElement;
    
    // Inline CSS variables on the clone itself
    for (const [key, value] of Object.entries(CSS_VARS)) {
      clone.style.setProperty(key, value);
    }
    
    // Ensure the clone is visible
    clone.style.visibility = 'visible';
    clone.style.opacity = '1';
    clone.style.display = 'flex';
    
    // Convert relative URLs to absolute and handle CORS
    await convertImagesToDataUrls(clone);
    
    // Inline computed styles on all elements to preserve appearance
    inlineComputedStyles(clone);
    
    tempContainer.appendChild(clone);
  }

  // Add empty placeholder cards if we have less than 9
  const emptySlots = 9 - cards.length;
  for (let i = 0; i < emptySlots; i++) {
    const placeholder = document.createElement('div');
    placeholder.style.cssText = `
      width: ${CARD_TOTAL_WIDTH}mm;
      height: ${CARD_TOTAL_HEIGHT}mm;
      background: white;
    `;
    tempContainer.appendChild(placeholder);
  }

  document.body.appendChild(tempContainer);

  // Wait for all images to load
  await waitUntilLoad(tempContainer);
  
  // Additional wait for layout to stabilize
  await new Promise(resolve => setTimeout(resolve, 300));

  console.log('Temp container dimensions:', tempContainer.offsetWidth, 'x', tempContainer.offsetHeight);
  console.log('Temp container children:', tempContainer.children.length);

  try {
    // Render to PNG using modern-screenshot
    const dataUrl = await domToPng(tempContainer, {
      scale: RENDER_SCALE,
      backgroundColor: '#ffffff',
      debug: DEBUG_MODE,
      timeout: 60000, // 60 seconds timeout for loading assets
    });

    console.log('Generated PNG data URL, length:', dataUrl.length);
    
    if (dataUrl.length < 5000) {
      console.warn('Data URL seems small, might indicate rendering issue');
    }

    // Debug mode: Download image to verify rendering
    if (DEBUG_MODE && pageIndex === 0) {
      const link = document.createElement('a');
      link.download = `debug-page-${pageIndex + 1}.png`;
      link.href = dataUrl;
      link.click();
      console.log('Debug image downloaded');
    }

    // Add image to PDF
    pdf.addImage(
      dataUrl,
      'PNG',
      GRID_LEFT_OFFSET,
      GRID_TOP_OFFSET,
      GRID_WIDTH,
      GRID_HEIGHT,
      undefined,
      'FAST'
    );
    console.log('Image added to PDF successfully');
  } finally {
    // Clean up temp container
    if (document.body.contains(tempContainer)) {
      document.body.removeChild(tempContainer);
    }
  }
}

/**
 * Inlines computed styles on an element and all its children
 * This ensures cloned elements render correctly outside their original context
 */
function inlineComputedStyles(element: HTMLElement): void {
  // Get all elements including the root
  const allElements = [element, ...Array.from(element.querySelectorAll('*'))] as HTMLElement[];
  
  for (const el of allElements) {
    if (!(el instanceof HTMLElement)) continue;
    
    const computed = window.getComputedStyle(el);
    
    // Key properties that might use CSS variables
    const propsToInline = [
      'background-color',
      'color', 
      'border-color',
      'font-family',
      'font-size',
      'font-weight',
      'font-style',
    ];
    
    for (const prop of propsToInline) {
      const value = computed.getPropertyValue(prop);
      if (value) {
        el.style.setProperty(prop, value);
      }
    }
  }
}

/**
 * Converts all images in an element tree to data URLs to avoid CORS issues
 * Uses canvas to convert already-loaded images to base64
 * Also handles background-image CSS properties
 */
async function convertImagesToDataUrls(element: HTMLElement): Promise<void> {
  const images = element.querySelectorAll('img');
  
  const conversions = Array.from(images).map(async (img) => {
    const src = img.src;
    if (!src || src.startsWith('data:')) {
      return; // Already a data URL or empty
    }
    
    try {
      // Handle SVG images differently - fetch as text and embed
      if (src.endsWith('.svg') || src.includes('.svg?')) {
        const response = await fetch(src);
        const svgText = await response.text();
        const svgBase64 = btoa(unescape(encodeURIComponent(svgText)));
        img.src = `data:image/svg+xml;base64,${svgBase64}`;
        return;
      }
      
      // Create a new image to ensure it's fully loaded
      const loadedImg = await loadImage(src);
      
      // Draw to canvas to get data URL (bypasses CORS for already-rendered images)
      const canvas = document.createElement('canvas');
      canvas.width = loadedImg.naturalWidth || loadedImg.width || 300;
      canvas.height = loadedImg.naturalHeight || loadedImg.height || 300;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('Failed to get canvas context');
        return;
      }
      
      ctx.drawImage(loadedImg, 0, 0);
      
      // Get data URL - use PNG for better quality
      const dataUrl = canvas.toDataURL('image/png');
      
      // Replace the src
      img.src = dataUrl;
    } catch (error) {
      console.warn(`Failed to convert image to data URL: ${src}`, error);
    }
  });
  
  await Promise.all(conversions);
  
  // Also handle background-image CSS properties
  const allElements = element.querySelectorAll('*');
  for (const el of Array.from(allElements)) {
    if (!(el instanceof HTMLElement)) continue;
    
    const bgImage = window.getComputedStyle(el).backgroundImage;
    if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
      // Extract URL from url("...")
      const match = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
      if (match && match[1] && !match[1].startsWith('data:')) {
        try {
          const response = await fetch(match[1]);
          const blob = await response.blob();
          const dataUrl = await blobToDataUrl(blob);
          el.style.backgroundImage = `url("${dataUrl}")`;
        } catch (error) {
          console.warn(`Failed to convert background image: ${match[1]}`, error);
        }
      }
    }
  }
}

/**
 * Converts a Blob to a data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Loads an image with crossOrigin attribute for CORS support
 * Returns a promise that resolves when the image is fully loaded
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => resolve(img);
    img.onerror = (e) => {
      console.warn(`Failed to load image: ${src}`);
      reject(e);
    };
    
    // Add cache-busting for CORS
    const urlObj = new URL(src, window.location.href);
    img.src = urlObj.href;
  });
}

/**
 * Adds cutting lines to the current PDF page
 * 
 * Lines are positioned 1mm INWARD from the card's outer edge to cut THROUGH
 * the black border (bleed). This ensures the final cut card retains a thin
 * black edge on all sides, preventing white edges from showing.
 * 
 * Card structure:
 * - Content: 63mm × 88mm
 * - Black border (bleed): 1mm on each side
 * - Total footprint: 65mm × 90mm
 * 
 * Cutting lines go through the border at the content edge.
 */
function addCuttingLines(pdf: jsPDF): void {
  // Line styling
  pdf.setDrawColor(0, 0, 0); // Black
  pdf.setLineWidth(0.15); // Super thin

  // Vertical cutting lines (6 total)
  // Lines are 1mm inward from outer edge to cut through the black border
  const verticalLinePositions = [
    CARD_BLEED, // Left cut line for card 1 (1mm inward)
    CARD_TOTAL_WIDTH - CARD_BLEED, // Right cut line for card 1 (64mm)
    CARD_TOTAL_WIDTH + CARD_MARGIN + CARD_BLEED, // Left cut line for card 2 (67mm)
    CARD_TOTAL_WIDTH * 2 + CARD_MARGIN - CARD_BLEED, // Right cut line for card 2 (130mm)
    CARD_TOTAL_WIDTH * 2 + CARD_MARGIN * 2 + CARD_BLEED, // Left cut line for card 3 (133mm)
    CARD_TOTAL_WIDTH * 3 + CARD_MARGIN * 2 - CARD_BLEED, // Right cut line for card 3 (196mm)
  ];

  // Draw vertical lines with dotted pattern
  verticalLinePositions.forEach((x) => {
    const absoluteX = GRID_LEFT_OFFSET + x;
    pdf.setLineDashPattern([0.5, 1], 0); // Dotted pattern
    pdf.line(absoluteX, 0, absoluteX, PAGE_HEIGHT);
  });

  // Horizontal cutting lines (6 total)
  // Lines are 1mm inward from outer edge to cut through the black border
  const horizontalLinePositions = [
    CARD_BLEED, // Top cut line for row 1 (1mm inward)
    CARD_TOTAL_HEIGHT - CARD_BLEED, // Bottom cut line for row 1 (89mm)
    CARD_TOTAL_HEIGHT + CARD_MARGIN + CARD_BLEED, // Top cut line for row 2 (92mm)
    CARD_TOTAL_HEIGHT * 2 + CARD_MARGIN - CARD_BLEED, // Bottom cut line for row 2 (180mm)
    CARD_TOTAL_HEIGHT * 2 + CARD_MARGIN * 2 + CARD_BLEED, // Top cut line for row 3 (183mm)
    CARD_TOTAL_HEIGHT * 3 + CARD_MARGIN * 2 - CARD_BLEED, // Bottom cut line for row 3 (271mm)
  ];

  // Draw horizontal lines with dotted pattern
  horizontalLinePositions.forEach((y) => {
    const absoluteY = GRID_TOP_OFFSET + y;
    pdf.setLineDashPattern([0.5, 1], 0); // Dotted pattern
    pdf.line(0, absoluteY, PAGE_WIDTH, absoluteY);
  });

  // Reset line dash pattern
  pdf.setLineDashPattern([], 0);
}



/**
 * Estimates the number of pages that will be generated
 * Based on card count: 9 cards per page
 */
export function estimatePageCount(): number {
  // Count all card elements using the mtg-card class
  const cards = document.querySelectorAll('.mtg-card');
  const cardCount = cards.length;
  
  // Calculate pages (9 cards per page, round up)
  return Math.ceil(cardCount / 9);
}
