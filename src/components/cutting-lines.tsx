/**
 * Cutting Lines Component for Print Layout
 * 
 * Renders 12 cutting guide lines (6 vertical + 6 horizontal) that cut
 * THROUGH the black border (bleed) of each card, 1mm inward from the
 * outer edge. This ensures the final cut card retains a thin black
 * edge on all sides, preventing white edges from showing.
 * 
 * Card dimensions (from CSS variables):
 * - --card-width: 63mm (content)
 * - --card-bleed: 1mm (black border on each side)
 * - Total card footprint: 65mm × 90mm
 * - --card-margin: 1mm (gap between cards)
 * 
 * Cut line positions (relative to grid):
 * - Vertical: 1mm, 64mm, 67mm, 130mm, 133mm, 196mm
 * - Horizontal: 1mm, 89mm (plus offsets for rows 2 & 3)
 * 
 * Grid structure in print mode:
 * - 3 columns × 3 rows
 * - Each column is exactly 65mm wide
 * - Grid gap is 1mm
 * - Total grid width: 65*3 + 1*2 = 197mm
 * 
 * First row cards have print:mt-5 margin (~5.29mm) pushing them down.
 * But the grid row height is auto, so it includes this margin.
 */

export default function CuttingLines() {
  // Card dimensions in mm (must match CSS variables)
  const cardContentWidth = 63;  // --card-width
  const cardBleed = 1;          // --card-bleed  
  const cardMargin = 1;         // --card-margin (grid gap)
  
  // Total card size including bleed border
  const cardTotalWidth = cardContentWidth + 2 * cardBleed;  // 65mm
  const cardTotalHeight = 88 + 2 * cardBleed;               // 90mm (88mm content + 2mm border)
  
  // ============================================
  // CALIBRATION ADJUSTMENTS
  // Tweak these values to fine-tune line positions
  // Positive = shift line right/down, Negative = shift line left/up
  // ============================================
  
  // Vertical line adjustments (in mm) - one per line
  const verticalAdjust = [
    // - moves the line right
    +0.1,      // Line 1: Left edge of card 1 (reference - keep at 0)
    -0.3,   // Line 2: Right edge of card 1
    +0.25,   // Line 3: Left edge of card 2
    -0.2,   // Line 4: Right edge of card 2
    +0.1,   // Line 5: Left edge of card 3
    -0.3,   // Line 6: Right edge of card 3
  ];
  
  // Horizontal line adjustments (in mm) - one per line
  const horizontalAdjust = [
    // - moves the line UP
    0,      // Line 1: Top edge of row 1 (reference - keep at 0)
    -0.3,   // Line 2: Bottom edge of row 1
    -0.5,   // Line 3: Top edge of row 2
    -0.8,   // Line 4: Bottom edge of row 2
    -0.75,   // Line 5: Top edge of row 3
    -1.3,   // Line 6: Bottom edge of row 3 (moved up more)
  ];
  
  // ============================================
  
  // Grid dimensions
  const gridWidth = cardTotalWidth * 3 + cardMargin * 2;  // 197mm

  // Vertical line positions (X coordinates from grid left edge)
  // Lines are 1mm INWARD from outer edge to cut THROUGH the black border
  // This ensures cut cards retain a thin black edge on all sides
  const verticalLineBasePositions = [
    cardBleed,                                           // Left cut for card 1 (1mm inward)
    cardTotalWidth - cardBleed,                          // Right cut for card 1 = 64mm
    cardTotalWidth + cardMargin + cardBleed,             // Left cut for card 2 = 67mm
    cardTotalWidth * 2 + cardMargin - cardBleed,         // Right cut for card 2 = 130mm
    cardTotalWidth * 2 + cardMargin * 2 + cardBleed,     // Left cut for card 3 = 133mm
    cardTotalWidth * 3 + cardMargin * 2 - cardBleed,     // Right cut for card 3 = 196mm
  ];
  
  // Apply calibration adjustments to vertical lines
  const verticalLines = verticalLineBasePositions.map((pos, i) => pos + verticalAdjust[i]);
  
  // Horizontal line positions (Y coordinates from grid top)
  // Row 1 cards are pushed down by print:mt-5 (1.25rem = 20px ≈ 5.29mm at 96dpi)
  const topOffset = 5.29;
  
  // Horizontal line positions - 1mm INWARD from outer edge to cut THROUGH the black border
  const horizontalLineBasePositions = [
    topOffset + cardBleed,                                           // Top cut for row 1 (1mm inward)
    topOffset + cardTotalHeight - cardBleed,                         // Bottom cut for row 1 = 94.29mm
    topOffset + cardTotalHeight + cardMargin + cardBleed,            // Top cut for row 2 = 97.29mm
    topOffset + cardTotalHeight * 2 + cardMargin - cardBleed,        // Bottom cut for row 2 = 185.29mm
    topOffset + cardTotalHeight * 2 + cardMargin * 2 + cardBleed,    // Top cut for row 3 = 188.29mm
    topOffset + cardTotalHeight * 3 + cardMargin * 2 - cardBleed,    // Bottom cut for row 3 = 276.29mm
  ];
  
  // Apply calibration adjustments to horizontal lines
  const horizontalLines = horizontalLineBasePositions.map((pos, i) => pos + horizontalAdjust[i]);

  // A4 page dimensions
  const pageWidth = 210;  // mm
  const pageHeight = 297; // mm
  
  // Grid offset from page edge (where the grid starts on the page)
  // The grid is centered on the page
  const gridLeftOffset = (pageWidth - gridWidth) / 2;  // (210 - 197) / 2 = 6.5mm
  const gridTopOffset = 0;  // Grid starts at top of content area

  return (
    <svg
      class="cutting-lines hidden print:block print:fixed"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        position: "fixed",
        top: "0",
        left: "0",
        width: `${pageWidth}mm`,
        height: `${pageHeight}mm`,
        "pointer-events": "none",
        "z-index": 9999,
      }}
      viewBox={`0 0 ${pageWidth} ${pageHeight}`}
      preserveAspectRatio="none"
    >
      {/* Vertical cutting lines - from top to bottom of page */}
      {verticalLines.map((x) => (
        <line
          x1={gridLeftOffset + x}
          y1={0}
          x2={gridLeftOffset + x}
          y2={pageHeight}
          stroke="#000000"
          stroke-width="0.15"
          stroke-dasharray="0.5 1"
        />
      ))}
      
      {/* Horizontal cutting lines - from left to right of page */}
      {horizontalLines.map((y) => (
        <line
          x1={0}
          y1={gridTopOffset + y}
          x2={pageWidth}
          y2={gridTopOffset + y}
          stroke="#000000"
          stroke-width="0.15"
          stroke-dasharray="0.5 1"
        />
      ))}
    </svg>
  );
}
