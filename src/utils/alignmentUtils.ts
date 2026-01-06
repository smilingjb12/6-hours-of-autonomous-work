/**
 * Alignment and Distribution Utilities
 * Provides functions for aligning and distributing multiple elements on a slide.
 */

import type { SlideElement, Position } from '../types/presentation'

/**
 * Alignment types for elements
 */
export type AlignmentType = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'

/**
 * Distribution types for elements
 */
export type DistributionType = 'horizontal' | 'vertical'

/**
 * Element bounds interface for calculations
 */
interface ElementBounds {
  id: string
  left: number
  right: number
  top: number
  bottom: number
  centerX: number
  centerY: number
  width: number
  height: number
}

/**
 * Get the bounds of an element
 */
function getElementBounds(element: SlideElement): ElementBounds {
  const left = element.position.x
  const top = element.position.y
  const width = element.dimensions.width
  const height = element.dimensions.height

  return {
    id: element.id,
    left,
    right: left + width,
    top,
    bottom: top + height,
    centerX: left + width / 2,
    centerY: top + height / 2,
    width,
    height,
  }
}

/**
 * Get the bounding box of all elements combined
 */
function getCombinedBounds(elements: SlideElement[]): {
  minX: number
  maxX: number
  minY: number
  maxY: number
  centerX: number
  centerY: number
} {
  const bounds = elements.map(getElementBounds)

  const minX = Math.min(...bounds.map(b => b.left))
  const maxX = Math.max(...bounds.map(b => b.right))
  const minY = Math.min(...bounds.map(b => b.top))
  const maxY = Math.max(...bounds.map(b => b.bottom))

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  }
}

/**
 * Calculate new positions for aligning elements
 * @param elements - The elements to align
 * @param alignmentType - The type of alignment
 * @returns Array of position updates for each element
 */
export function calculateAlignmentPositions(
  elements: SlideElement[],
  alignmentType: AlignmentType
): Array<{ id: string; position: Position }> {
  if (elements.length < 2) {
    return []
  }

  const combined = getCombinedBounds(elements)

  return elements.map(element => {
    const bounds = getElementBounds(element)
    let newX = element.position.x
    let newY = element.position.y

    switch (alignmentType) {
      case 'left':
        newX = combined.minX
        break
      case 'center':
        newX = combined.centerX - bounds.width / 2
        break
      case 'right':
        newX = combined.maxX - bounds.width
        break
      case 'top':
        newY = combined.minY
        break
      case 'middle':
        newY = combined.centerY - bounds.height / 2
        break
      case 'bottom':
        newY = combined.maxY - bounds.height
        break
    }

    return {
      id: element.id,
      position: { x: newX, y: newY },
    }
  })
}

/**
 * Calculate new positions for distributing elements evenly
 * @param elements - The elements to distribute
 * @param distributionType - The type of distribution (horizontal or vertical)
 * @returns Array of position updates for each element
 */
export function calculateDistributionPositions(
  elements: SlideElement[],
  distributionType: DistributionType
): Array<{ id: string; position: Position }> {
  if (elements.length < 3) {
    // Need at least 3 elements to distribute
    return []
  }

  const bounds = elements.map(el => ({
    element: el,
    bounds: getElementBounds(el),
  }))

  if (distributionType === 'horizontal') {
    // Sort by x position (left edge)
    bounds.sort((a, b) => a.bounds.left - b.bounds.left)

    // Get the leftmost and rightmost elements
    const first = bounds[0]
    const last = bounds[bounds.length - 1]

    if (!first || !last) return []

    // Calculate total space and element widths
    const totalWidth = last.bounds.right - first.bounds.left
    const totalElementWidth = bounds.reduce((sum, b) => sum + b.bounds.width, 0)
    const totalGap = totalWidth - totalElementWidth
    const gapBetweenElements = totalGap / (bounds.length - 1)

    // Calculate new positions
    let currentX = first.bounds.left

    return bounds.map((item, index) => {
      let newX: number

      if (index === 0) {
        // Keep first element in place
        newX = item.bounds.left
      } else if (index === bounds.length - 1) {
        // Keep last element in place
        newX = item.bounds.left
      } else {
        // Position this element after the previous one
        newX = currentX
      }

      currentX = newX + item.bounds.width + gapBetweenElements

      // Only update middle elements, keep first and last in place
      if (index === 0 || index === bounds.length - 1) {
        return {
          id: item.element.id,
          position: item.element.position,
        }
      }

      return {
        id: item.element.id,
        position: { x: newX, y: item.element.position.y },
      }
    }).map(item => {
      // Fix: recalculate middle elements based on even distribution
      const elem = bounds.find(b => b.element.id === item.id)
      if (!elem) return item

      const index = bounds.indexOf(elem)
      if (index === 0 || index === bounds.length - 1) {
        return item
      }

      // Calculate the target position for even distribution
      let accumulatedX = first.bounds.left + first.bounds.width + gapBetweenElements
      for (let i = 1; i < index; i++) {
        const prevElem = bounds[i]
        if (prevElem) {
          accumulatedX += prevElem.bounds.width + gapBetweenElements
        }
      }

      return {
        id: item.id,
        position: { x: accumulatedX, y: elem.element.position.y },
      }
    })
  } else {
    // Vertical distribution
    // Sort by y position (top edge)
    bounds.sort((a, b) => a.bounds.top - b.bounds.top)

    // Get the topmost and bottommost elements
    const first = bounds[0]
    const last = bounds[bounds.length - 1]

    if (!first || !last) return []

    // Calculate total space and element heights
    const totalHeight = last.bounds.bottom - first.bounds.top
    const totalElementHeight = bounds.reduce((sum, b) => sum + b.bounds.height, 0)
    const totalGap = totalHeight - totalElementHeight
    const gapBetweenElements = totalGap / (bounds.length - 1)

    // Calculate new positions
    return bounds.map((item, index) => {
      if (index === 0 || index === bounds.length - 1) {
        return {
          id: item.element.id,
          position: item.element.position,
        }
      }

      // Calculate the target position for even distribution
      let accumulatedY = first.bounds.top + first.bounds.height + gapBetweenElements
      for (let i = 1; i < index; i++) {
        const prevElem = bounds[i]
        if (prevElem) {
          accumulatedY += prevElem.bounds.height + gapBetweenElements
        }
      }

      return {
        id: item.element.id,
        position: { x: item.element.position.x, y: accumulatedY },
      }
    })
  }
}

/**
 * Check if alignment operation is available
 */
export function canAlign(selectedCount: number): boolean {
  return selectedCount >= 2
}

/**
 * Check if distribution operation is available
 */
export function canDistribute(selectedCount: number): boolean {
  return selectedCount >= 3
}
