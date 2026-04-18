import { useContext, useMemo, useState } from "react";
import { AppContext } from "../../App";
import Modal from "../../components/Modal";
import StatusBadge from "../../components/StatusBadge";
import Timeline from "../../components/Timeline";
import VerificationIndicator from "../../components/VerificationIndicator";

function AdminComplaintsPage() {
  const { complaints, updateComplaint } = useContext(AppContext);
  const [selectedId, setSelectedId] = useState(complaints[0]?.id || "");
  const [showIvr, setShowIvr] = useState(false);
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");

  const filteredComplaints = useMemo(
    () => complaints.filter((item) => {
      const sourcePass = sourceFilter === "ALL" || item.source === sourceFilter;
      const locationPass = locationFilter === "ALL" || item.locationStatus === locationFilter;
      return sourcePass && locationPass;
    }),
    [complaints, sourceFilter, locationFilter]
  );

  const selected = useMemo(
    () => filteredComplaints.find((item) => item.id === selectedId) || filteredComplaints[0],
    [filteredComplaints, selectedId]
  );

  const decideFinalStatus = (ivrResponse, complaint) => {
    if (ivrResponse === "Yes" && complaint.verification?.gpsMatch && complaint.verification?.photoUploaded) return "Verified";
    if (ivrResponse === "No") return complaint.resolvedAt ? "Reopened" : "Failed";
    return "Resolved";
  };

  const handleIvr = (ivrResponse) => {
    const date = new Date().toISOString().slice(0, 10);
    updateComplaint(selected.id, {
      verification: { ivrResponse, gpsMatch: Boolean(selected.verification?.gpsMatch), photoUploaded: Boolean(selected.verification?.photoUploaded) },
      status: decideFinalStatus(ivrResponse, selected),
      timeline: [...(selected.timeline || []), { label: `IVR Response: ${ivrResponse}`, date }]
    });
    setShowIvr(false);
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Admin Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Complaint Table</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Click a row to inspect verification details, timeline, and IVR status.</p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-2">
        <label className="text-sm">
          <span className="mb-2 block font-semibold text-slate-700">Source</span>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900">
            <option value="ALL">All</option>
            <option value="APP_IMAGE">APP_IMAGE</option>
            <option value="APP_TEXT">APP_TEXT</option>
            <option value="IVR_CALL">IVR_CALL</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-2 block font-semibold text-slate-700">Location Status</span>
          <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900">
            <option value="ALL">All</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="MISSING">MISSING</option>
            <option value="NEEDS_IVR_FOLLOWUP">NEEDS_IVR_FOLLOWUP</option>
          </select>
        </label>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-card">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-4 font-semibold">ID</th>
                <th className="px-4 py-4 font-semibold">Title</th>
                <th className="px-4 py-4 font-semibold">Source</th>
                <th className="px-4 py-4 font-semibold">Department</th>
                <th className="px-4 py-4 font-semibold">Location Status</th>
                <th className="px-4 py-4 font-semibold">IVR</th>
                <th className="px-4 py-4 font-semibold">GPS</th>
                <th className="px-4 py-4 font-semibold">Photo</th>
                <th className="px-4 py-4 font-semibold">Final Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredComplaints.map((complaint) => (
                <tr key={complaint.id} onClick={() => setSelectedId(complaint.id)} className={`cursor-pointer transition hover:bg-slate-50 ${selectedId === complaint.id ? "bg-blue-50/60" : ""}`}>
                  <td className="px-4 py-4 font-semibold text-slate-900">{complaint.id}</td>
                  <td className="px-4 py-4 text-slate-900">{complaint.title}</td>
                  <td className="px-4 py-4 text-slate-600">{complaint.source || "APP_TEXT"}</td>
                  <td className="px-4 py-4 text-slate-600">{complaint.department}</td>
                  <td className="px-4 py-4 text-slate-600">{complaint.locationStatus || "AVAILABLE"}</td>
                  <td className="px-4 py-4 text-slate-600">{complaint.verification?.ivrResponse || "No"}</td>
                  <td className="px-4 py-4 text-slate-600">{complaint.verification?.gpsMatch ? "✔" : "✖"}</td>
                  <td className="px-4 py-4 text-slate-600">{complaint.verification?.photoUploaded ? "✔" : "✖"}</td>
                  <td className="px-4 py-4"><StatusBadge status={complaint.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-card">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold text-slate-900">{selected.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{selected.department}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <VerificationIndicator verification={selected.verification} />

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Verification Details</p>
                <p className="mt-2 text-sm text-slate-600">Source: {selected.source || "APP_TEXT"}</p>
                <p className="text-sm text-slate-600">Location status: {selected.locationStatus || "AVAILABLE"}</p>
                <p className="mt-2 text-sm text-slate-600">IVR response: {selected.verification?.ivrResponse || "No"}</p>
                <p className="text-sm text-slate-600">GPS match: {selected.verification?.gpsMatch ? "Yes" : "No"}</p>
                <p className="text-sm text-slate-600">Photo proof: {selected.verification?.photoUploaded ? "Yes" : "No"}</p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-900">Timeline</h4>
                <Timeline items={selected.timeline || []} />
              </div>

              <button type="button" onClick={() => setShowIvr(true)} className="rounded-2xl bg-blue-700 px-5 py-3 font-semibold text-white shadow-lg shadow-blue-700/20">Launch IVR Simulation</button>
            </>
          ) : null}
        </aside>
      </div>

      <Modal open={showIvr} title="IVR Simulation" onClose={() => setShowIvr(false)}>
        <p className="text-sm leading-7 text-slate-600">Is your complaint resolved?</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={() => handleIvr("Yes")} className="rounded-2xl bg-emerald-700 px-5 py-3 font-semibold text-white">Yes</button>
          <button type="button" onClick={() => handleIvr("No")} className="rounded-2xl bg-rose-700 px-5 py-3 font-semibold text-white">No</button>
        </div>
      </Modal>
    </section>
  );
}

export default AdminComplaintsPage;
