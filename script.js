const letters = ['W', 'E', 'N', 'D', 'A', 'O'];
const clans = [
    { name: 'Chevreuil', goal: 'Ligne complète' },
    { name: 'Loup', goal: 'Les 4 coins' },
    { name: 'Ours', goal: 'Carré protecteur' },
    { name: 'Tortue', goal: 'Carte pleine' }
];

function initGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    // En-têtes W-E-N-D-A-O
    letters.forEach(l => {
        const div = document.createElement('div');
        div.className = 'header';
        div.innerText = l;
        grid.appendChild(div);
    });

    for (let i = 0; i < 36; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        
        const row = Math.floor(i / 6);
        const col = i % 6;
        
        if ((row === 2 || row === 3) && (col === 2 || col === 3)) {
            cell.classList.add('heart');
            cell.innerHTML = "CLAN"; 
        } else {
            // Ici, on utilise de vrais numéros selon la logique Wendao
            const num = genererNumeroValide(col); 
            cell.innerHTML = `<strong>${num}</strong>`;
            
            // AU CLIC : On joue le son ET on coche la case
            cell.onclick = () => {
                jouerSon(num);
                cell.classList.toggle('active');
            };
        }
        grid.appendChild(cell);
    }
}

function tirerClan() {
    const clan = clans[Math.floor(Math.random() * clans.length)];
    document.getElementById('clan-status').innerHTML = 
        `Clan tiré : <strong>${clan.name}</strong> - Objectif : <em>${clan.goal}</em>`;
}
function jouerSon(numero) {
    // On suppose que vos fichiers sont nommés "1.wav", "2.wav", etc.
    const audio = new Audio(`Sound/${numero}.wav`);
    
    audio.play().catch(error => {
        console.error("Erreur de lecture : Vérifiez que le fichier existe dans /Sound", error);
    });
}

initGrid();