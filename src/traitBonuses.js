// traitBonuses.js - Calcul des bonus/malus de traits sur jets

const getTraitBonuses = (character, rollType, rollTarget) => {
    const bonuses = {
        auto: 0,           // Bonus/malus automatiques
        conditional: []    // Bonus conditionnels cliquables
    };
    
    if (!character.traits) return bonuses;
    
    // Déterminer si c'est un jet de CARAC PURE (pas compétence)
    const isCaracRoll = !rollTarget;
    
    character.traits.forEach(charTrait => {
        const trait = TRAITS.find(t => t.name === charTrait.name);
        if (!trait) return;
        
        // Extraire bonus/malus de la description des effets
        const effects = trait.effects?.description || '';
        
        // BONUS INCONDITIONNELS
        
        // Borgne : Intimidation (+1), Perception (-1)
        if (trait.name === 'Borgne') {
            if (rollTarget === 'Intimidation') bonuses.auto += 1;
            if (rollTarget === 'Perception') bonuses.auto -= 1;
            if (isCaracRoll && rollType === 'perception') bonuses.auto -= 1; // Jet carac pure
        }
        
        // Tatouage : Chance (+1) SEULEMENT sur jet carac pure
        if (trait.name === 'Tatouage') {
            if (isCaracRoll && rollType === 'chance') bonuses.auto += 1;
        }
        
        // Skald : Charisme (+1) SEULEMENT carac pure, Folklore (+1)
        if (trait.name === 'Skald') {
            if (isCaracRoll && rollType === 'charisme') bonuses.auto += 1;
            if (rollTarget === 'Folklore') bonuses.auto += 1;
        }
        
        // Godi : Loi (+1), Charisme (+1) SEULEMENT carac pure
        if (trait.name === 'Godi') {
            if (rollTarget === 'Loi') bonuses.auto += 1;
            if (isCaracRoll && rollType === 'charisme') bonuses.auto += 1;
        }
        
        // Noble lignée : Charisme (+1) SEULEMENT carac pure
        if (trait.name === 'Noble lignée') {
            if (isCaracRoll && rollType === 'charisme') bonuses.auto += 1;
        }
        
        // Ancien esclave : Survie (+1), Chance (-1) SEULEMENT carac pure
        if (trait.name === 'Ancien esclave') {
            if (rollTarget === 'Survie') bonuses.auto += 1;
            if (isCaracRoll && rollType === 'chance') bonuses.auto -= 1;
        }
        
        // Langue de serpent : Charisme (+2) SEULEMENT carac pure
        if (trait.name === 'Langue de serpent') {
            if (isCaracRoll && rollType === 'charisme') bonuses.auto += 2;
        }
        
        // Sommeil léger : Perception (+1) la nuit
        if (trait.name === 'Sommeil léger') {
            bonuses.conditional.push({
                name: 'Sommeil léger',
                bonus: 1,
                condition: 'La nuit / obscurité',
                applies: (isCaracRoll && rollType === 'perception') || rollTarget === 'Perception'
            });
        }
        
        // Campeur : Survie (+1), Chance (+1) SEULEMENT carac pure
        if (trait.name === 'Campeur') {
            if (rollTarget === 'Survie') bonuses.auto += 1;
            if (isCaracRoll && rollType === 'chance') bonuses.auto += 1;
        }
        
        // Force de géant : Force (+2) SEULEMENT carac pure
        if (trait.name === 'Force de géant') {
            if (isCaracRoll && rollType === 'force') bonuses.auto += 2;
        }
        
        // Sanglant : Charisme (-1) SEULEMENT carac pure
        if (trait.name === 'Sanglant') {
            if (isCaracRoll && rollType === 'charisme') bonuses.auto -= 1;
        }
        
        // Impistable : +2 sur défense traque
        if (trait.name === 'Impistable') {
            bonuses.conditional.push({
                name: 'Impistable',
                bonus: 2,
                condition: 'Défense contre traque',
                applies: rollTarget === 'Traque/Chasse'
            });
        }
        
        // Grande concentration : +1 sur compétence choisie
        if (trait.name === 'Grande concentration') {
            bonuses.conditional.push({
                name: 'Grande concentration',
                bonus: 1,
                condition: 'Sur compétence choisie (à définir)',
                applies: false // Le joueur doit choisir
            });
        }
        
        // Tatouage : Intimidation (+1) vs chrétiens
        if (trait.name === 'Tatouage') {
            bonuses.conditional.push({
                name: 'Tatouage',
                bonus: 1,
                condition: 'Intimidation vs chrétiens',
                applies: rollTarget === 'Intimidation'
            });
        }
        
        // Marin : Charpentier marine (+1)
        if (trait.name === 'Marin') {
            if (rollTarget === 'Charpentier marine') bonuses.auto += 1;
        }
        
        // Vaurien : Larcin (+1), Langue Orale/Mentir (+1)
        if (trait.name === 'Vaurien') {
            if (rollTarget === 'Larcin') bonuses.auto += 1;
            bonuses.conditional.push({
                name: 'Vaurien',
                bonus: 1,
                condition: 'Langue Orale (mentir uniquement)',
                applies: rollTarget === 'Langue orale'
            });
        }
        
        // Duelliste : Combat CàC (+1)
        if (trait.name === 'Duelliste') {
            if (rollTarget === 'Combat CàC') bonuses.auto += 1;
        }
        
        // Boxeur : Combat sans arme (+1)
        if (trait.name === 'Boxeur') {
            bonuses.conditional.push({
                name: 'Boxeur',
                bonus: 1,
                condition: 'Combat sans arme',
                applies: rollTarget === 'Combat CàC'
            });
        }
        
        // Divorcé : Survie (+1)
        if (trait.name === 'Divorcé') {
            if (rollTarget === 'Survie') bonuses.auto += 1;
        }
        
        // Sens de l'orientation : Navigation (+1)
        if (trait.name === 'Sens de l\'orientation') {
            if (rollTarget === 'Navigation') bonuses.auto += 1;
        }
        
        // Banni : Survie (+1)
        if (trait.name === 'Banni') {
            if (rollTarget === 'Survie') bonuses.auto += 1;
        }
        
        // Troublé : Divination (+2), +1 difficulté (malus général)
        if (trait.name === 'Troublé') {
            if (rollTarget === 'Divination') bonuses.auto += 2;
            // Le +1 difficulté est géré dans DiceModal séparément
        }
        
        // Veuf/Veuve : Survie (+1), Chance (-1) carac pure
        if (trait.name === 'Veuf/Veuve') {
            if (rollTarget === 'Survie') bonuses.auto += 1;
            if (isCaracRoll && rollType === 'chance') bonuses.auto -= 1;
        }
        
        // Fin négociant : Marchandage (+1)
        if (trait.name === 'Fin négociant') {
            if (rollTarget === 'Marchandage') bonuses.auto += 1;
        }
        
        // Maître des bêtes : Dressage (+1)
        if (trait.name === 'Maître des bêtes') {
            if (rollTarget === 'Dressage') bonuses.auto += 1;
        }
        
        // Insaisissable : Esquive (+1)
        if (trait.name === 'Insaisissable') {
            if (rollTarget === 'Esquive') bonuses.auto += 1;
        }
        
        // Sang de glace : Survie hiver (+1)
        if (trait.name === 'Sang de glace') {
            bonuses.conditional.push({
                name: 'Sang de glace',
                bonus: 1,
                condition: 'Survie en hiver',
                applies: rollTarget === 'Survie'
            });
        }
        
        // Enfant des nuits blanches : Perception jour (+1), Charisme (+1) carac pure, Perception nuit (-1)
        if (trait.name === 'Enfant des nuits blanches') {
            if (isCaracRoll && rollType === 'charisme') bonuses.auto += 1;
            bonuses.conditional.push({
                name: 'Enfant nuits blanches (jour)',
                bonus: 1,
                condition: 'Perception en plein jour',
                applies: (isCaracRoll && rollType === 'perception') || rollTarget === 'Perception'
            });
            bonuses.conditional.push({
                name: 'Enfant nuits blanches (nuit)',
                bonus: -1,
                condition: 'Perception dans obscurité',
                applies: (isCaracRoll && rollType === 'perception') || rollTarget === 'Perception'
            });
        }
        
        // Enfant de l'hiver noir : Perception nuit (+1), Intimidation (+1), Perception jour (-1)
        if (trait.name === 'Enfant de l\'hiver noir') {
            bonuses.conditional.push({
                name: 'Enfant hiver noir (nuit)',
                bonus: 1,
                condition: 'Perception dans obscurité',
                applies: (isCaracRoll && rollType === 'perception') || rollTarget === 'Perception'
            });
            bonuses.conditional.push({
                name: 'Enfant hiver noir (jour)',
                bonus: -1,
                condition: 'Perception en pleine lumière',
                applies: (isCaracRoll && rollType === 'perception') || rollTarget === 'Perception'
            });
            if (rollTarget === 'Intimidation') bonuses.auto += 1;
        }
        
        // Orphelin aguerri : Survie (+1), Larcin (+1), Charisme (-1) carac pure
        if (trait.name === 'Orphelin aguerri') {
            if (rollTarget === 'Survie') bonuses.auto += 1;
            if (rollTarget === 'Larcin') bonuses.auto += 1;
            if (isCaracRoll && rollType === 'charisme') bonuses.auto -= 1;
        }
        
        // Dernier de la lignée : Chance (-1) carac pure
        if (trait.name === 'Dernier de la lignée') {
            if (isCaracRoll && rollType === 'chance') bonuses.auto -= 1;
        }
        
        // Serment rompu : Charisme (-2) carac pure, Intimidation (+1), Chance (-1) carac pure
        if (trait.name === 'Serment rompu') {
            if (isCaracRoll && rollType === 'charisme') bonuses.auto -= 2;
            if (rollTarget === 'Intimidation') bonuses.auto += 1;
            if (isCaracRoll && rollType === 'chance') bonuses.auto -= 1;
        }
        
        // Dette de sang : Charisme (-1) carac pure, Survie (+1)
        if (trait.name === 'Dette de sang') {
            if (isCaracRoll && rollType === 'charisme') bonuses.auto -= 1;
            if (rollTarget === 'Survie') bonuses.auto += 1;
        }
        
        // Porte-poisse : Charisme (-2) carac pure, Chance (+2) carac pure
        if (trait.name === 'Porte-poisse') {
            if (isCaracRoll && rollType === 'charisme') bonuses.auto -= 2;
            if (isCaracRoll && rollType === 'chance') bonuses.auto += 2;
        }
        
        // Tueur de monstre : Intimidation (+1)
        if (trait.name === 'Tueur de monstre') {
            if (rollTarget === 'Intimidation') bonuses.auto += 1;
        }
        
        // Sous le regard de X : +1 sur carac spécifique CARAC PURE
        if (trait.name === 'Sous le regard d\'Odin' && isCaracRoll && rollType === 'intelligence') bonuses.auto += 1;
        if (trait.name === 'Sous le regard de Thor' && isCaracRoll && rollType === 'force') bonuses.auto += 1;
        if (trait.name === 'Sous le regard de Tyr' && isCaracRoll && rollType === 'agilite') bonuses.auto += 1;
        if (trait.name === 'Sous le regard de Freyr' && isCaracRoll && rollType === 'charisme') bonuses.auto += 1;
        if (trait.name === 'Sous le regard de Freyja' && isCaracRoll && rollType === 'perception') bonuses.auto += 1;
        if (trait.name === 'Sous le regard de Loki' && isCaracRoll && rollType === 'chance') bonuses.auto += 1;
        
        // Lien avec les Landvættir : Survie nature (+1), Dressage (+1)
        if (trait.name === 'Lien avec les Landvættir') {
            if (rollTarget === 'Dressage') bonuses.auto += 1;
            bonuses.conditional.push({
                name: 'Landvættir',
                bonus: 1,
                condition: 'Survie en milieu naturel',
                applies: rollTarget === 'Survie'
            });
        }
        
        // Jumeau/Jumelle : Perception (+1) carac pure ou compétence
        if (trait.name === 'Jumeau/Jumelle') {
            if ((isCaracRoll && rollType === 'perception') || rollTarget === 'Perception') bonuses.auto += 1;
        }
        
        // Né sous mauvais augure : Chance (+1) carac pure, Charisme (-1) carac pure, Intimidation (+1)
        if (trait.name === 'Né sous mauvais augure') {
            if (isCaracRoll && rollType === 'chance') bonuses.auto += 1;
            if (isCaracRoll && rollType === 'charisme') bonuses.auto -= 1;
            if (rollTarget === 'Intimidation') bonuses.auto += 1;
        }
        
        // Rêveur prophétique : Perception (+1) carac pure ou compétence
        if (trait.name === 'Rêveur prophétique') {
            if ((isCaracRoll && rollType === 'perception') || rollTarget === 'Perception') bonuses.auto += 1;
        }
        
        // Survivant miraculeux : Survie (+1)
        if (trait.name === 'Survivant miraculeux') {
            if (rollTarget === 'Survie') bonuses.auto += 1;
        }
        
        // Marqué par les Nornes : Chance (+1) carac pure, Charisme (-1) carac pure
        if (trait.name === 'Marqué par les Nornes') {
            if (isCaracRoll && rollType === 'chance') bonuses.auto += 1;
            if (isCaracRoll && rollType === 'charisme') bonuses.auto -= 1;
        }
        
        // Forme de loup/ours : Perception (+1) carac pure ou compétence
        if ((trait.name === 'Forme de loup' || trait.name === 'Forme d\'ours') && 
            ((isCaracRoll && rollType === 'perception') || rollTarget === 'Perception')) {
            bonuses.auto += 1;
        }
    });
    
    return bonuses;
};
