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
        <div className="ns-item-row">
            {/* Bouton équiper — style cachet */}
            {editMode && (
                <button
                    onClick={() => handleToggleEquip(idx)}
                    className="shrink-0 text-xs px-1.5 py-0.5 rounded-sm border transition-colors"
                    style={item.location === 'equipped'
                        ? { borderColor: 'var(--ns-ornament)', color: 'var(--ns-ornament)' }
                        : { borderColor: 'var(--color-border)', color: 'var(--color-muted)' }}
                    title={item.location === 'equipped' ? 'Déséquiper' : 'Équiper'}
                >
                    {item.location === 'equipped' ? '⚔' : '○'}
                </button>
            )}

            {/* Nom + détails */}
            <div className="flex-1 min-w-0">
                <span className="ns-item-name">{item.name}</span>
                {item.quantity > 1 && (
                    <span className="ns-item-meta ml-1.5">×{item.quantity}</span>
                )}
                {item.damage_value > 0 && (
                    <span className="ns-item-meta ml-1.5" style={{ color: 'var(--color-danger)' }}>
                        [{item.damage_value}D]
                    </span>
                )}
                {item.armor_value && (
                    <span className="ns-item-meta ml-1.5" style={{ color: 'var(--color-secondary)' }}>
                        ({item.armor_value})
                    </span>
                )}
                {item.description && (
                    <span className="ns-item-meta ml-1.5 truncate">— {item.description}</span>
                )}
            </div>

            {/* Catégorie — Rajdhani condensé */}
            <span className="ns-item-meta shrink-0">{CATEGORIES[item.category]}</span>

            {editMode && (
                <button onClick={() => handleRemove(idx)} className="text-danger text-xs shrink-0">✕</button>
            )}
        </div>
    );

    return (
        <div className="ns-card ns-paper space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    <h2 className="ns-domain-header" style={{ color: 'var(--ns-ornament)', borderBottom: 'none', paddingBottom: 0 }}>
                        Inventaire
                    </h2>
                    <div className="flex-1 h-px" style={{ background: 'var(--ns-ornament)', opacity: 0.2 }} />
                </div>
                {editMode && (
                    <button
                        onClick={() => setAdding(a => !a)}
                        className="ns-btn-ghost ml-3"
                        style={{ padding: '0.2rem 0.6rem', fontSize: '0.6rem' }}
                    >
                        {adding ? '✕ Annuler' : '+ Ajouter'}
                    </button>
                )}
            </div>

            {editMode && adding && (
                <div className="ns-add-form space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            placeholder="Nom de l'objet"
                            className="ns-input col-span-2"
                            value={draft.name}
                            onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                        />
                        <select className="ns-select" value={draft.category}
                                onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}>
                            {Object.entries(CATEGORIES).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                        <input type="number" min="1" placeholder="Quantité"
                               className="ns-input"
                               value={draft.quantity}
                               onChange={e => setDraft(d => ({ ...d, quantity: +e.target.value }))}
                        />
                        <input type="number" min="0" placeholder="Dégâts (0 si inerte)"
                               className="ns-input"
                               value={draft.damage_value}
                               onChange={e => setDraft(d => ({ ...d, damage_value: +e.target.value }))}
                        />
                        <input placeholder="Protection (ex: 2D/0D)"
                               className="ns-input"
                               value={draft.armor_value}
                               onChange={e => setDraft(d => ({ ...d, armor_value: e.target.value }))}
                        />
                        <input placeholder="Description"
                               className="ns-input col-span-2"
                               value={draft.description}
                               onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                        />
                        <input type="number" min="0" placeholder="§ Prix (Selvarins)"
                               className="ns-input"
                               value={draft.price}
                               onChange={e => setDraft(d => ({ ...d, price: +e.target.value }))}
                        />
                    </div>
                    <button onClick={handleAdd} disabled={!draft.name.trim()} className="ns-btn-primary w-full">
                        + Ajouter à l'inventaire
                    </button>
                </div>
            )}

            {items.length === 0 && (
                <p className="text-muted text-xs italic">Inventaire vide.</p>
            )}

            {equipped.length > 0 && (
                <div>
                    <p className="ns-section-label" style={{ color: 'var(--ns-ornament)' }}>⚔ Équipé</p>
                    {equipped.map((it) => (
                        <ItemRow key={it.id ?? it.name} item={it} idx={items.indexOf(it)} />
                    ))}
                </div>
            )}

            {equipped.length > 0 && inventory.length > 0 && (
                <hr className="ns-divider-ornate" />
            )}

            {inventory.length > 0 && (
                <div>
                    {equipped.length > 0 && (
                        <p className="ns-section-label">◻ Sac</p>
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