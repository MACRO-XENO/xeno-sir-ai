import React, { useState } from "react";
import { useLectures, useManageLectures, useStudents, useManageStudents } from "@/hooks/use-api-hooks";
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Textarea, Dialog, Badge } from "@/components/ui";
import { Book, Users, Plus, Trash2, Edit, FileText, UserPlus, Clock, NotebookText } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"lectures" | "students">("lectures");

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
      <header className="px-8 py-6 border-b border-white/5 bg-card/50 backdrop-blur-sm shrink-0">
        <h1 className="text-3xl font-display font-bold text-foreground tracking-tight">Admin Portal</h1>
        <p className="text-muted-foreground mt-1">Manage Xeno Sir's knowledge base and students.</p>
        
        <div className="flex gap-2 mt-8">
          <button 
            onClick={() => setActiveTab("lectures")}
            className={`px-6 py-2.5 rounded-t-xl text-sm font-semibold transition-colors border-t border-x ${activeTab === "lectures" ? "bg-secondary text-primary border-white/10 border-b-transparent" : "bg-transparent text-muted-foreground border-transparent hover:bg-white/5"}`}
          >
            <div className="flex items-center gap-2"><Book className="w-4 h-4" /> Lectures</div>
          </button>
          <button 
            onClick={() => setActiveTab("students")}
            className={`px-6 py-2.5 rounded-t-xl text-sm font-semibold transition-colors border-t border-x ${activeTab === "students" ? "bg-secondary text-primary border-white/10 border-b-transparent" : "bg-transparent text-muted-foreground border-transparent hover:bg-white/5"}`}
          >
            <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Students</div>
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-8 bg-secondary/30">
        {activeTab === "lectures" ? <LecturesManager /> : <StudentsManager />}
      </div>
    </div>
  );
}

function LecturesManager() {
  const { data: lectures = [], isLoading } = useLectures();
  const { create, update, remove } = useManageLectures();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    lectureNumber: "",
    title: "",
    transcript: "",
    notes: ""
  });

  const openAdd = () => {
    setEditingLecture(null);
    setFormData({ lectureNumber: "", title: "", transcript: "", notes: "" });
    setIsDialogOpen(true);
  };

  const openEdit = (l: any) => {
    setEditingLecture(l);
    setFormData({
      lectureNumber: l.lectureNumber.toString(),
      title: l.title,
      transcript: l.transcript,
      notes: l.notes || ""
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        lectureNumber: parseInt(formData.lectureNumber),
        title: formData.title,
        transcript: formData.transcript,
        notes: formData.notes || undefined
      };
      
      if (editingLecture) {
        await update.mutateAsync({ id: editingLecture.id, data: payload });
      } else {
        await create.mutateAsync({ data: payload });
      }
      setIsDialogOpen(false);
    } catch (err) {
      alert("Failed to save lecture.");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this lecture permanently?")) {
      await remove.mutateAsync({ id });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-display font-semibold text-foreground">Lecture Transcripts</h2>
        <Button onClick={openAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Lecture
        </Button>
      </div>

      <Card className="border-white/10">
        <div className="divide-y divide-white/5">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : lectures.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No lectures added yet. Start building the knowledge base.</p>
            </div>
          ) : (
            lectures.map((l) => (
              <div key={l.id} className="p-6 flex items-start justify-between hover:bg-white/5 transition-colors group">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center shrink-0">
                    <span className="text-[10px] uppercase text-primary font-bold">Lec</span>
                    <span className="text-lg font-display text-primary leading-none mt-0.5">{l.lectureNumber}</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">{l.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2 max-w-3xl">{l.transcript}</p>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground/60">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Added {new Date(l.createdAt).toLocaleDateString()}</span>
                      {l.notes && (
                        <span className="flex items-center gap-1 text-primary/70">
                          <NotebookText className="w-3 h-3" /> Notes added
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="outline" size="sm" onClick={() => openEdit(l)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(l.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Dialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
        title={editingLecture ? "Edit Lecture" : "Add New Lecture"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-1 space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Number</label>
              <Input 
                type="number" 
                required 
                value={formData.lectureNumber} 
                onChange={e => setFormData({...formData, lectureNumber: e.target.value})}
              />
            </div>
            <div className="col-span-3 space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Title</label>
              <Input 
                type="text" 
                required 
                value={formData.title} 
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Transcript Content</label>
            <Textarea 
              required 
              rows={12}
              placeholder="Paste the full lecture transcript here. This is what Xeno Sir will learn from."
              value={formData.transcript} 
              onChange={e => setFormData({...formData, transcript: e.target.value})}
              className="font-mono text-xs leading-relaxed"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Lecture Notes</label>
              <span className="text-xs text-muted-foreground/50 italic">Optional — students can read these</span>
            </div>
            <Textarea 
              rows={8}
              placeholder="Write clean, well-formatted notes for students. Markdown supported (# Headings, **bold**, - bullet points, etc.)"
              value={formData.notes} 
              onChange={e => setFormData({...formData, notes: e.target.value})}
              className="text-sm leading-relaxed"
            />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={create.isPending || update.isPending}>Save Lecture</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

function StudentsManager() {
  const { data: students = [], isLoading } = useStudents();
  const { create, remove } = useManageStudents();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({ username: "", password: "", displayName: "" });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ data: formData });
      setIsAddOpen(false);
      setFormData({ username: "", password: "", displayName: "" });
    } catch (err) {
      alert("Failed to create student");
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Delete this student? This removes all their chat history too.")) {
      await remove.mutateAsync({ id });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-display font-semibold text-foreground">Enrolled Students</h2>
        <Button onClick={() => setIsAddOpen(true)}>
          <UserPlus className="w-4 h-4 mr-2" /> Add Student
        </Button>
      </div>

      <Card className="border-white/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/5 bg-black/20 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4 font-semibold">Name</th>
              <th className="px-6 py-4 font-semibold">Username</th>
              <th className="px-6 py-4 font-semibold">Joined</th>
              <th className="px-6 py-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Loading...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No students enrolled yet.</td></tr>
            ) : (
              students.map(s => (
                <tr key={s.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-xs border border-white/10">
                        {s.displayName.charAt(0)}
                      </div>
                      <span className="font-medium text-foreground">{s.displayName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground">@{s.username}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      Remove
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      <Dialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Student">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Full Name</label>
            <Input required value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} placeholder="e.g. Rahul Sharma" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Login Username</label>
            <Input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="Unique identifier" />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-muted-foreground">Password</label>
            <Input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={create.isPending}>Create Account</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
