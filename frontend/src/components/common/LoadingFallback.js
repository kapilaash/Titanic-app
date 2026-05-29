const LoadingFallback = ({ label = 'Loading section...' }) => {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto" />
        <p className="mt-4 text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
};

export default LoadingFallback;
