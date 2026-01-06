/**
 * Unit tests for alignment utility functions
 */

import {
  calculateAlignmentPositions,
  calculateDistributionPositions,
  canAlign,
  canDistribute,
} from '../alignmentUtils'
import type { SlideElement, ShapeElement } from '@/types/presentation'

// Helper to create test elements
function createTestElement(id: string, x: number, y: number, width: number, height: number): ShapeElement {
  return {
    id,
    type: 'shape',
    position: { x, y },
    dimensions: { width, height },
    rotation: 0,
    zIndex: 0,
    opacity: 1,
    locked: false,
    shapeType: 'rectangle',
    fillColor: '#f97316',
    strokeColor: '#ea580c',
    strokeWidth: 2,
  }
}

describe('alignmentUtils', () => {
  describe('canAlign', () => {
    it('should return false for 0 elements', () => {
      expect(canAlign(0)).toBe(false)
    })

    it('should return false for 1 element', () => {
      expect(canAlign(1)).toBe(false)
    })

    it('should return true for 2 elements', () => {
      expect(canAlign(2)).toBe(true)
    })

    it('should return true for more than 2 elements', () => {
      expect(canAlign(5)).toBe(true)
    })
  })

  describe('canDistribute', () => {
    it('should return false for 0 elements', () => {
      expect(canDistribute(0)).toBe(false)
    })

    it('should return false for 1 element', () => {
      expect(canDistribute(1)).toBe(false)
    })

    it('should return false for 2 elements', () => {
      expect(canDistribute(2)).toBe(false)
    })

    it('should return true for 3 elements', () => {
      expect(canDistribute(3)).toBe(true)
    })

    it('should return true for more than 3 elements', () => {
      expect(canDistribute(5)).toBe(true)
    })
  })

  describe('calculateAlignmentPositions', () => {
    it('should return empty array for less than 2 elements', () => {
      const element = createTestElement('1', 100, 100, 50, 50)
      expect(calculateAlignmentPositions([element], 'left')).toEqual([])
      expect(calculateAlignmentPositions([], 'left')).toEqual([])
    })

    describe('left alignment', () => {
      it('should align elements to the leftmost edge', () => {
        const elements: SlideElement[] = [
          createTestElement('1', 100, 100, 50, 50), // leftmost
          createTestElement('2', 200, 150, 60, 60),
          createTestElement('3', 300, 120, 40, 40),
        ]

        const result = calculateAlignmentPositions(elements, 'left')

        expect(result).toHaveLength(3)
        expect(result[0]?.position.x).toBe(100) // Already at leftmost
        expect(result[1]?.position.x).toBe(100) // Moved to 100
        expect(result[2]?.position.x).toBe(100) // Moved to 100
      })
    })

    describe('right alignment', () => {
      it('should align elements to the rightmost edge', () => {
        const elements: SlideElement[] = [
          createTestElement('1', 100, 100, 50, 50), // right edge at 150
          createTestElement('2', 200, 150, 60, 60), // right edge at 260
          createTestElement('3', 300, 120, 40, 40), // right edge at 340 (rightmost)
        ]

        const result = calculateAlignmentPositions(elements, 'right')

        expect(result).toHaveLength(3)
        // All elements should have their right edge at 340
        expect(result[0]?.position.x).toBe(340 - 50) // 290
        expect(result[1]?.position.x).toBe(340 - 60) // 280
        expect(result[2]?.position.x).toBe(340 - 40) // 300 (already there)
      })
    })

    describe('center alignment', () => {
      it('should align elements to the horizontal center', () => {
        const elements: SlideElement[] = [
          createTestElement('1', 100, 100, 50, 50),
          createTestElement('2', 300, 150, 50, 50),
        ]

        const result = calculateAlignmentPositions(elements, 'center')

        expect(result).toHaveLength(2)
        // Combined bounds: left=100, right=350, center=225
        // Element 1 center should be at 225, so x = 225 - 25 = 200
        // Element 2 center should be at 225, so x = 225 - 25 = 200
        expect(result[0]?.position.x).toBe(200)
        expect(result[1]?.position.x).toBe(200)
      })
    })

    describe('top alignment', () => {
      it('should align elements to the topmost edge', () => {
        const elements: SlideElement[] = [
          createTestElement('1', 100, 150, 50, 50),
          createTestElement('2', 200, 100, 60, 60), // topmost
        ]

        const result = calculateAlignmentPositions(elements, 'top')

        expect(result).toHaveLength(2)
        expect(result[0]?.position.y).toBe(100) // Moved to 100
        expect(result[1]?.position.y).toBe(100) // Already at 100
      })
    })

    describe('bottom alignment', () => {
      it('should align elements to the bottommost edge', () => {
        const elements: SlideElement[] = [
          createTestElement('1', 100, 100, 50, 50), // bottom at 150
          createTestElement('2', 200, 150, 60, 80), // bottom at 230 (bottommost)
        ]

        const result = calculateAlignmentPositions(elements, 'bottom')

        expect(result).toHaveLength(2)
        // All elements should have their bottom edge at 230
        expect(result[0]?.position.y).toBe(230 - 50) // 180
        expect(result[1]?.position.y).toBe(230 - 80) // 150 (already there)
      })
    })

    describe('middle alignment', () => {
      it('should align elements to the vertical center', () => {
        const elements: SlideElement[] = [
          createTestElement('1', 100, 100, 50, 50),
          createTestElement('2', 200, 200, 50, 50),
        ]

        const result = calculateAlignmentPositions(elements, 'middle')

        expect(result).toHaveLength(2)
        // Combined bounds: top=100, bottom=250, center=175
        // Element 1 center should be at 175, so y = 175 - 25 = 150
        // Element 2 center should be at 175, so y = 175 - 25 = 150
        expect(result[0]?.position.y).toBe(150)
        expect(result[1]?.position.y).toBe(150)
      })
    })
  })

  describe('calculateDistributionPositions', () => {
    it('should return empty array for less than 3 elements', () => {
      const element1 = createTestElement('1', 100, 100, 50, 50)
      const element2 = createTestElement('2', 200, 100, 50, 50)
      expect(calculateDistributionPositions([element1, element2], 'horizontal')).toEqual([])
      expect(calculateDistributionPositions([element1], 'horizontal')).toEqual([])
      expect(calculateDistributionPositions([], 'horizontal')).toEqual([])
    })

    describe('horizontal distribution', () => {
      it('should evenly distribute elements horizontally', () => {
        const elements: SlideElement[] = [
          createTestElement('1', 100, 100, 50, 50), // left edge at 100
          createTestElement('2', 200, 100, 50, 50), // middle - should be moved
          createTestElement('3', 400, 100, 50, 50), // right edge at 450
        ]

        const result = calculateDistributionPositions(elements, 'horizontal')

        expect(result).toHaveLength(3)
        // First and last elements should stay in place
        expect(result[0]?.position.x).toBe(100)
        expect(result[2]?.position.x).toBe(400)
        // Middle element should be evenly distributed
        // Total width = 450 - 100 = 350
        // Total element widths = 50 + 50 + 50 = 150
        // Total gap = 350 - 150 = 200
        // Gap between elements = 200 / 2 = 100
        // Middle element x = 100 + 50 + 100 = 250
        expect(result[1]?.position.x).toBe(250)
      })
    })

    describe('vertical distribution', () => {
      it('should evenly distribute elements vertically', () => {
        const elements: SlideElement[] = [
          createTestElement('1', 100, 100, 50, 50), // top edge at 100
          createTestElement('2', 100, 200, 50, 50), // middle - should be moved
          createTestElement('3', 100, 400, 50, 50), // bottom edge at 450
        ]

        const result = calculateDistributionPositions(elements, 'vertical')

        expect(result).toHaveLength(3)
        // First and last elements should stay in place
        expect(result[0]?.position.y).toBe(100)
        expect(result[2]?.position.y).toBe(400)
        // Middle element should be evenly distributed
        // Total height = 450 - 100 = 350
        // Total element heights = 50 + 50 + 50 = 150
        // Total gap = 350 - 150 = 200
        // Gap between elements = 200 / 2 = 100
        // Middle element y = 100 + 50 + 100 = 250
        expect(result[1]?.position.y).toBe(250)
      })
    })
  })
})
