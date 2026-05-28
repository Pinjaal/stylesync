export default function HistoryPage() {
  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-1">History</h1>
      <p className="text-sm text-gray-500 mb-6">What you wore and when.</p>
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-white">
        <p className="text-gray-500">Nothing logged yet.</p>
      </div>
    </div>
  )
}