import { useState } from 'react';
import { ExternalLink, Plus, X } from 'lucide-react';
import type { Project, ProjectLink } from '@/lib/types';
import { useUpdateProject } from '@/hooks/useProjects';
import InlineEdit from '@/components/InlineEdit';

export default function ProjectInfoTab({ project }: { project: Project }) {
  const update = useUpdateProject();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');

  function saveLinks(links: ProjectLink[]) {
    update.mutate({ id: project.id, patch: { links } });
  }

  function addLink() {
    if (!newLabel.trim() || !newUrl.trim()) return;
    saveLinks([...project.links, { label: newLabel.trim(), url: newUrl.trim() }]);
    setNewLabel('');
    setNewUrl('');
    setAdding(false);
  }

  function removeLink(idx: number) {
    saveLinks(project.links.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-xs uppercase tracking-wider text-muted font-medium mb-2">
          Beschrijving
        </h2>
        <div className="text-sm leading-relaxed">
          <InlineEdit
            value={project.description ?? ''}
            onSave={(description) =>
              update.mutate({
                id: project.id,
                patch: { description: description || null },
              })
            }
            placeholder="Waar gaat dit project over?"
            multiline
          />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase tracking-wider text-muted font-medium">
            Links & stakeholders
          </h2>
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="text-xs text-muted hover:text-text inline-flex items-center gap-1"
            >
              <Plus size={12} /> Toevoegen
            </button>
          )}
        </div>

        <div className="space-y-1.5">
          {project.links.map((link, i) => (
            <div
              key={i}
              className="group flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-md text-sm"
            >
              <ExternalLink size={13} className="text-muted shrink-0" />
              <a
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 truncate hover:underline"
              >
                <span className="font-medium">{link.label}</span>
                <span className="text-muted ml-2 text-xs">{link.url}</span>
              </a>
              <button
                onClick={() => removeLink(i)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface2 text-muted hover:text-red-500"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {adding && (
            <div className="flex flex-col sm:flex-row gap-2 p-2 bg-surface border border-border rounded-md">
              <input
                autoFocus
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Label (bv. Stakeholder Jan)"
                className="flex-1 bg-transparent text-sm focus:outline-none px-1"
              />
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 bg-transparent text-sm focus:outline-none px-1"
              />
              <div className="flex gap-1">
                <button
                  onClick={addLink}
                  className="text-xs px-2 py-1 rounded bg-accent text-white"
                >
                  Toevoegen
                </button>
                <button
                  onClick={() => setAdding(false)}
                  className="text-xs px-2 py-1 rounded text-muted hover:bg-surface2"
                >
                  Annuleer
                </button>
              </div>
            </div>
          )}

          {project.links.length === 0 && !adding && (
            <p className="text-xs text-muted">Geen links toegevoegd.</p>
          )}
        </div>
      </section>
    </div>
  );
}
