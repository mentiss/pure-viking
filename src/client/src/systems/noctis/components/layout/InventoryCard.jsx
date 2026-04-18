import { useState } from 'react';

const CATEGORIES = {
    arme_cac:     'Arme C-à-C',
    arme_feu:     'Arme à feu',
    arme_etherum: 'Arme Étherum',
    armure:       'Armure',
    equipement:   'Équipement',
    medical:      'Médical',
    etherum:      'Étherum',
    misc:         'Divers',
};

const EMPTY_ITEM = {
    name: '', description: '', category: 'misc', quantity: 1,
    location: 'inventory', damage_value: 0, armor_value: '', price: 0, notes: '',
};

const InventoryCard = ({ character, editMode, onChange }) => {
    const items = character.items ?? [];
    const [adding, setAdding] = useState(false);
    const [draft,  setDraft]  = useState(EMPTY_ITEM);

    const handleAdd = () => {
        if (!draft.name.trim()) return;
        onChange([...items, { ...draft }]);
        setDraft(EMPTY_ITEM);
        setAdding(false);
    };

    const handleRemove     = (idx) => onChange(items.filter((_, i) => i !== idx));
    const handleToggleEquip = (idx) => onChange(
        items.map((it, i) => i === idx
            ? { ...it, location: it.location === 'equipped' ? 'inventory' : 'equipped' }
            : it
        )
    );

    const equipped  = items.filter(i => i.location === 'equipped');
    const inventory = items.filter(i => i.location !== 'equipped');

    const ItemRow = ({ item, idx }) => (
        <div className="flex items-center gap-2 py-1 border-b border-default last:border-0">
            {editMode && (
                <button
                    onClick={() => handleToggleEquip(idx)}
                    className={`text-xs px-1 py-0.5 rounded border ${
                        item.location === 'equipped'
                            ? 'border-primary text-primary'
                            : 'border-default text-muted'
                    }`}
                >
                    {item.location === 'equipped' ? '⚔' : '○'}
                </button>
            )}
            <div className="flex-1 min-w-0">
                <span className="text-default text-sm">{item.name}</span>
                {item.quantity > 1 && (
                    <span className="text-muted text-xs ml-1">×{item.quantity}</span>
                )}
                {item.damage_value > 0 && (
                    <span className="text-danger text-xs ml-1">[{item.damage_value}]</span>
                )}
                {item.armor_value && (
                    <span className="text-secondary text-xs ml-1">({item.armor_value})</span>
                )}
                {item.description && (
                    <span className="text-muted text-xs ml-1 truncate">— {item.description}</span>
                )}
            </div>
            <span className="text-muted text-xs shrink-0">{CATEGORIES[item.category]}</span>
            {editMode && (
                <button onClick={() => handleRemove(idx)} className="text-danger text-xs">✕</button>
            )}
        </div>
    );

    return (
        <div className="bg-surface border border-default rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <h2 className="text-primary font-bold text-sm uppercase tracking-wide">
                    Inventaire
                    <span className="text-muted text-xs font-normal ml-1">({items.length})</span>
                </h2>
                {editMode && (
                    <button
                        onClick={() => setAdding(a => !a)}
                        className="text-xs px-2 py-1 rounded border border-primary text-primary"
                    >
                        {adding ? 'Annuler' : '+ Ajouter'}
                    </button>
                )}
            </div>

            {editMode && adding && (
                <div className="bg-surface-alt rounded p-3 space-y-2 border border-default">
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            placeholder="Nom de l'objet"
                            className="col-span-2 bg-surface border border-default rounded px-2 py-1 text-sm text-default"
                            value={draft.name}
                            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        />
                        <select
                            className="bg-surface border border-default rounded px-2 py-1 text-sm text-default"
                            value={draft.category}
                            onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                        >
                            {Object.entries(CATEGORIES).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                        <input type="number" min="1"
                               placeholder="Quantité"
                               className="bg-surface border border-default rounded px-2 py-1 text-sm text-default"
                               value={draft.quantity}
                               onChange={e => setDraft(d => ({ ...d, quantity: +e.target.value }))}
                        />
                        <input type="number" min="0"
                               placeholder="Dégâts (0 si pas arme)"
                               className="bg-surface border border-default rounded px-2 py-1 text-sm text-default"
                               value={draft.damage_value}
                               onChange={e => setDraft(d => ({ ...d, damage_value: +e.target.value }))}
                        />
                        <input
                            placeholder="Protection (ex: 2D/0D)"
                            className="bg-surface border border-default rounded px-2 py-1 text-sm text-default"
                            value={draft.armor_value}
                            onChange={e => setDraft(d => ({ ...d, armor_value: e.target.value }))}
                        />
                        <input
                            placeholder="Description"
                            className="col-span-2 bg-surface border border-default rounded px-2 py-1 text-sm text-default"
                            value={draft.description}
                            onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                        />
                        <input type="number" min="0"
                               placeholder="Prix (Selvarins)"
                               className="bg-surface border border-default rounded px-2 py-1 text-sm text-default"
                               value={draft.price}
                               onChange={e => setDraft(d => ({ ...d, price: +e.target.value }))}
                        />
                    </div>
                    <button
                        onClick={handleAdd}
                        disabled={!draft.name.trim()}
                        className="w-full py-1 text-sm rounded bg-primary text-accent font-bold disabled:opacity-40"
                    >
                        Ajouter
                    </button>
                </div>
            )}

            {items.length === 0 && (
                <p className="text-muted text-xs italic">Inventaire vide.</p>
            )}

            {equipped.length > 0 && (
                <div>
                    <p className="text-muted text-xs uppercase mb-1">Équipé</p>
                    {equipped.map((it) => (
                        <ItemRow key={it.id ?? it.name} item={it} idx={items.indexOf(it)} />
                    ))}
                </div>
            )}

            {inventory.length > 0 && (
                <div>
                    {equipped.length > 0 && (
                        <p className="text-muted text-xs uppercase mb-1 mt-2">Sac</p>
                    )}
                    {inventory.map((it) => (
                        <ItemRow key={it.id ?? it.name} item={it} idx={items.indexOf(it)} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default InventoryCard;