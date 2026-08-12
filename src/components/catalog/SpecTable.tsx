interface Spec {
  key: string;
  value: string;
}

export function SpecTable({ specs }: { specs: Spec[] }) {
  if (specs.length === 0) return null;
  return (
    <table className="w-full text-sm">
      <tbody>
        {specs.map((s, i) => (
          <tr key={s.key + i} className="border-b border-steel-100 last:border-0">
            <th
              scope="row"
              className="w-2/5 py-2.5 pr-4 text-left font-normal text-steel-500"
            >
              {s.key}
            </th>
            <td className="py-2.5 font-medium text-steel-900">{s.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
