import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/auth/actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-6">Profile</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <p className="text-xs text-gray-500 mb-1">Signed in as</p>
        <p className="font-medium break-all">{user?.email}</p>
      </div>

      <form action={logout}>
        <button
          type="submit"
          className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
        >
          Log out
        </button>
      </form>
    </div>
  )
}