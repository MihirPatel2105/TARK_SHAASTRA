function Timeline({ items }) {
  if (!items?.length) {
    return <p className="mt-2 text-sm text-slate-500">No timeline events recorded yet.</p>;
  }

  return (
    <ol className="relative mt-4 border-l border-slate-300 pl-6">
      {items.map((item) => (
        <li key={`${item.label}-${item.date}`} className="relative mb-5">
          <span className="absolute -left-[27px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow-sm" />
          <p className="font-semibold text-slate-900">{item.label}</p>
          <p className="text-sm text-slate-500">{item.date}</p>
        </li>
      ))}
    </ol>
  );
}

export default Timeline;
