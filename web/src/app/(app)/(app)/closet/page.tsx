export default function ClosetPage() {
  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-1">Closet</h1>
      <p className="text-sm text-gray-500 mb-6">Your wardrobe lives here.</p>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white">
        <p className="text-gray-500">No items yet.</p>
        <p className="text-xs text-gray-400 mt-1">We'll add upload in Step 9.</p>
      </div>
    </div>
  )
}