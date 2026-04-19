import { useContext, useMemo, useState } from "react";
import { AppContext } from "../../App";
import StatusBadge from "../../components/StatusBadge";
import Timeline from "../../components/Timeline";
import VerificationIndicator from "../../components/VerificationIndicator";
import { verifyAdminComplaint } from "../../services/backendApi";

function AdminComplaintsPage() {
  const { complaints, refreshComplaints } = useContext(AppContext);
  const [selectedId, setSelectedId] = useState(complaints[0]?.id || "");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [districtFilter, setDistrictFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [actionError, setActionError] = useState("");

  const districtOptions = useMemo(
    () => Array.from(new Set(complaints.map((item) => item.district).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [complaints]
  );

  const departmentOptions = useMemo(
    () => Array.from(new Set(complaints.map((item) => item.department).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [complaints]
  );

  const filteredComplaints = useMemo(
    () => complaints.filter((item) => {
      const statusPass =
        statusFilter === "ALL" ||
        (statusFilter === "PENDING_BUCKET" && (item.status === "Pending" || item.status === "In Progress")) ||
        (statusFilter === "RESOLVED_BUCKET" && (item.status === "Resolved" || item.status === "Verified" || item.status === "Reopened" || item.status === "Failed")) ||
        item.status === statusFilter;
      const sourcePass = sourceFilter === "ALL" || item.source === sourceFilter;
      const locationPass = locationFilter === "ALL" || item.locationStatus === locationFilter;
      const districtPass = districtFilter === "ALL" || item.district === districtFilter;
      const departmentPass = departmentFilter === "ALL" || item.department === departmentFilter;
      return statusPass && sourcePass && locationPass && districtPass && departmentPass;
    }),
    [complaints, statusFilter, sourceFilter, locationFilter, districtFilter, departmentFilter]
  );

  const selected = useMemo(
    () => filteredComplaints.find((item) => item.id === selectedId) || filteredComplaints[0],
    [filteredComplaints, selectedId]
  );

  const applyVerificationDecision = async (status) => {
    if (!selected?.id) {
      return;
    }

    setActionError("");

    try {
      await verifyAdminComplaint(selected.id, status);
      await refreshComplaints();
    } catch (error) {
      setActionError(error.message || "Unable to update admin decision.");
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Admin Workspace</p>
        <h2 className="mt-2 text-3xl font-bold text-slate-900">Complaint Table</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">Click a row to inspect verification details and complaint timeline.</p>
      </div>

      <div className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-sm">
          <span className="mb-2 block font-semibold text-slate-700">Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900">
            <option value="ALL">All</option>
            <option value="PENDING_BUCKET">Pending (All)</option>
            <option value="RESOLVED_BUCKET">Resolved (All)</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
            <option value="Verified">Verified</option>
            <option value="Reopened">Reopened</option>
            <option value="Failed">Failed</option>
          </select>
        </label>

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
            <option value="NEEDS_LOCATION">NEEDS_LOCATION</option>
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-2 block font-semibold text-slate-700">District</span>
          <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900">
            <option value="ALL">All</option>
            {districtOptions.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          <span className="mb-2 block font-semibold text-slate-700">Department</span>
          <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900">
            <option value="ALL">All</option>
            {departmentOptions.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
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
                <th className="px-4 py-4 font-semibold">District</th>
                <th className="px-4 py-4 font-semibold">Location Status</th>
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
                  <td className="px-4 py-4 text-slate-600">{complaint.district || "Unknown"}</td>
                  <td className="px-4 py-4 text-slate-600">{complaint.locationStatus || "AVAILABLE"}</td>
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
                  <p className="mt-1 text-sm text-slate-500">{selected.district || "Unknown district"}</p>
                </div>
                <StatusBadge status={selected.status} />
              </div>

              <VerificationIndicator verification={selected.verification} />

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-900">Verification Details</p>
                <p className="mt-2 text-sm text-slate-600">Source: {selected.source || "APP_TEXT"}</p>
                <p className="text-sm text-slate-600">Location status: {selected.locationStatus || "AVAILABLE"}</p>
                <p className="text-sm text-slate-600">GPS match: {selected.verification?.gpsMatch ? "Yes" : "No"}</p>
                <p className="text-sm text-slate-600">Photo proof: {selected.verification?.photoUploaded ? "Yes" : "No"}</p>
                <p className="mt-2 text-sm text-slate-600">Citizen points delta: {selected.scoring?.citizenPointsDelta ?? 0}</p>
                <p className="text-sm text-slate-600">Department points delta: {selected.scoring?.departmentPointsDelta ?? 0}</p>
                <p className="text-sm text-slate-600">Fake complaint flag: {selected.scoring?.fakeComplaintFlag ? "Yes" : "No"}</p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-900">Timeline</h4>
                <Timeline items={selected.timeline || []} />
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => applyVerificationDecision("VERIFIED")} className="rounded-2xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Mark Verified</button>
                <button type="button" onClick={() => applyVerificationDecision("REOPENED")} className="rounded-2xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white">Mark Reopened</button>
                <button type="button" onClick={() => applyVerificationDecision("FAILED")} className="rounded-2xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white">Mark Fake / Failed</button>
              </div>
              {actionError ? <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{actionError}</p> : null}
            </>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

export default AdminComplaintsPage;
