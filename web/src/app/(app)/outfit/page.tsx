import { Sparkles } from 'lucide-react'

export default function OutfitPage() {
  return (
    <main className="px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Get an outfit</h1>

      <div className="border-2 border-dashed border-gray-200 rounded-xl py-16 text-center">
        <Sparkles size={28} className="mx-auto text-gray-400 mb-2" />
        <p className="text-gray-500 text-sm mb-1">Outfit recommendations</p>
        <p className="text-gray-400 text-xs">Coming in Step 10</p>
      </div>
    </main>
  )
}