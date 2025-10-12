export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Forest Cabin</h1>
        <p className="text-lg text-gray-400 mb-8">
          Your curated content feed for intentional digital consumption
        </p>
        <div className="space-x-4">
          <a
            href="/login"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg inline-block"
          >
            Login
          </a>
          <a
            href="/register"
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg inline-block"
          >
            Register
          </a>
        </div>
      </div>
    </div>
  );
}
