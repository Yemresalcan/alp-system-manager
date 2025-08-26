import { useState, useEffect } from 'react'
import { Plus, Minus } from 'lucide-react'

interface QuantityInputProps {
  techId: string
  initialValue: number
  maxValue: number
  onQuantityChange: (techId: string, quantity: number) => void
}

export default function QuantityInput({ 
  techId, 
  initialValue, 
  maxValue, 
  onQuantityChange 
}: QuantityInputProps) {
  const [localQuantity, setLocalQuantity] = useState(initialValue)

  useEffect(() => {
    setLocalQuantity(initialValue)
  }, [initialValue])

  const updateQuantity = (newValue: number) => {
    const clampedValue = Math.max(1, Math.min(newValue, maxValue))
    setLocalQuantity(clampedValue)
    onQuantityChange(techId, clampedValue)
  }

  return (
    <div className="flex items-center space-x-1">
      <button
        type="button"
        onClick={() => updateQuantity(localQuantity - 1)}
        className="p-1 text-gray-400 hover:text-gray-600"
        disabled={localQuantity <= 1}
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        min="1"
        max={maxValue}
        value={localQuantity}
        onChange={(e) => {
          const newValue = parseInt(e.target.value) || 1
          setLocalQuantity(newValue)
        }}
        onBlur={(e) => {
          const newValue = Math.max(1, Math.min(parseInt(e.target.value) || 1, maxValue))
          updateQuantity(newValue)
        }}
        className="w-16 px-2 py-1 text-center border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      <button
        type="button"
        onClick={() => updateQuantity(localQuantity + 1)}
        className="p-1 text-gray-400 hover:text-gray-600"
        disabled={localQuantity >= maxValue}
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  )
}
