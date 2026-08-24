<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Arcathlon | Contrôleur</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.1.3/firebase-database-compat.js"></script>
    <style>body { background: #0f172a; font-family: sans-serif; color: white; user-select: none; }</style>
</head>
<body class="p-6 max-w-lg mx-auto flex flex-col h-screen">

    <h1 class="text-3xl font-black text-blue-500 uppercase italic text-center mb-6">Contrôleur Arcathlon</h1>

    <!-- Sélection Équipe -->
    <div class="mb-4">
        <label class="block text-xs font-black text-slate-400 uppercase mb-2">Équipe :</label>
        <select id="selEquipeCtrl" class="w-full bg-slate-900 border-2 border-slate-700 rounded-xl p-4 text-xl font-black uppercase text-white outline-none mb-4">
            <option value="">-- Choisir --</option>
            <!-- Rempli dynamiquement -->
        </select>
    </div>

    <!-- Sélection Maillot -->
    <div class="mb-4">
        <label class="block text-xs font-black text-slate-400 uppercase mb-2">Qui passe ?</label>
        <div class="grid grid-cols-4 gap-2">
            <button onclick="setColor('Rouge')" id="btn-Rouge" class="bg-red-950 border-2 border-red-500 p-4 rounded-2xl font-black text-red-400 uppercase active:scale-95">Rouge</button>
            <button onclick="setColor('Jaune')" id="btn-Jaune" class="bg-yellow-950 border-2 border-yellow-500 p-4 rounded-2xl font-black text-yellow-400 uppercase active:scale-95">Jaune</button>
            <button onclick="setColor('Bleu')" id="btn-Bleu" class="bg-blue-950 border-2 border-blue-500 p-4 rounded-2xl font-black text-blue-400 uppercase active:scale-95">Bleu</button>
            <button onclick="setColor('Vert')" id="btn-Vert" class="bg-green-950 border-2 border-green-500 p-4 rounded-2xl font-black text-green-400 uppercase active:scale-95">Vert</button>
        </div>
    </div>

    <!-- Chrono -->
    <div class="bg-slate-800 p-6 rounded-[2rem] border-2 border-slate-700 text-center mt-4 flex-1 flex flex-col justify-center">
        <div id="chronoDisplay" class="text-8xl font-mono font-black text-yellow-400 mb-6">00:00</div>
        <p id="currentSelection" class="text-sm font-black text-slate-400 uppercase mb-6">Sélectionnez une équipe et un maillot</p>
        
        <div class="grid grid-cols-2 gap-4 mb-6">
            <button id="btnStart" onclick="startChrono()" class="bg-emerald-600 py-6 rounded-2xl border-4 border-emerald-400 font-black text-2xl uppercase active:scale-95 transition-transform" disabled>▶ Départ</button>
            <button id="btnStop" onclick="stopChrono()" class="bg-red-600 py-6 rounded-2xl border-4 border-red-400 font-black text-2xl uppercase active:scale-95 transition-transform" disabled>⏹ Arrivée</button>
        </div>

        <div class="mb-4">
            <label class="block text-xs font-black text-slate-400 uppercase mb-2">Points de Tir (0 à 20)</label>
            <input type="number" id="ptsTirInput" min="0" max="20" value="0" class="w-full bg-black border-2 border-zinc-700 rounded-xl p-3 text-center text-3xl font-black text-white outline-none">
        </div>

        <button onclick="sendPassage()" id="btnSend" class="bg-blue-600 py-4 rounded-xl font-black text-lg uppercase text-white border-4 border-blue-400 active:scale-95 transition-transform" disabled>📡 Envoyer le Passage</button>
    </div>

    <script>
        const firebaseConfig = { databaseURL: "https://arcathlon-eps-default-rtdb.europe-west1.firebasedatabase.app/" };
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();

        let currentEq = "";
        let currentColor = "";
        let startTime = null;
        let timerInterval = null;
        let dureeMs = 0;

        // Récupération de la config pour remplir la liste des équipes
        db.ref('arcathlon/config/equipes').on('value', snap => {
            const eqs = snap.val() || {};
            let opts = '<option value="">-- Choisir --</option>';
            Object.keys(eqs).forEach(eq => {
                opts += `<option value="${eq}">${eq}</option>`;
            });
            document.getElementById('selEquipeCtrl').innerHTML = opts;
        });

        function setTeam(team) {
            currentEq = team;
            updateStatus();
        }
        
        function setColor(color) {
            currentColor = color;
            ['Rouge', 'Jaune', 'Bleu', 'Vert'].forEach(c => {
                const btn = document.getElementById('btn-' + c);
                if (c === color) btn.classList.add('ring-4', 'ring-white');
                else btn.classList.remove('ring-4', 'ring-white');
            });
            updateStatus();
        }

        function updateStatus() {
            const canStart = currentEq && currentColor;
            document.getElementById('btnStart').disabled = !canStart;
            document.getElementById('currentSelection').innerText = currentEq + " - " + currentColor;
        }

        window.onload = function() {
            document.getElementById('selEquipeCtrl').addEventListener('change', function() {
                setTeam(this.value);
            });
        };

        function startChrono() {
            if (!currentEq || !currentColor) return alert("Sélectionnez une équipe et un maillot !");
            startTime = Date.now();
            document.getElementById('btnStart').disabled = true;
            document.getElementById('btnStop').disabled = false;
            document.getElementById('btnSend').disabled = true;
            timerInterval = setInterval(updateDisplay, 50);
        }

        function stopChrono() {
            if (!startTime) return;
            clearInterval(timerInterval);
            dureeMs = Date.now() - startTime;
            document.getElementById('btnStop').disabled = true;
            document.getElementById('btnSend').disabled = false;
        }

        function updateDisplay() {
            const elapsed = Date.now() - startTime;
            const sec = Math.floor(elapsed / 1000);
            const min = Math.floor(sec / 60);
            document.getElementById('chronoDisplay').innerText = 
                `${String(min).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
        }

        function sendPassage() {
            if (dureeMs <= 0) return alert("Aucun chrono !");
            
            const ptsTir = parseInt(document.getElementById('ptsTirInput').value) || 0;
            const distance = 200; // Distance configurée

            // Logique identique à eleve.html pour la VMA
            const key = `${currentEq}-${currentColor}`;
            db.ref(`arcathlon/config/vmaReference/${key}`).once('value', snap => {
                const vmaRef = snap.val() || 12;
                const vitesse = distance / (dureeMs / 1000);
                const ptsVMA = (vitesse >= vmaRef + 1) ? 3 : (vitesse >= vmaRef - 0.5) ? 2 : (vitesse >= vmaRef - 1) ? 1 : 0;

                db.ref('arcathlon/live/passages').push({
                    equipe: currentEq,
                    maillot: currentColor,
                    ptsVMA: ptsVMA,
                    ptsTir: ptsTir,
                    temps: dureeMs,
                    vitesse: vitesse,
                    serie: 1, // Peut être modifié
                    mode: "sprint",
                    timestamp: Date.now(),
                    alerteTriche: false
                }).then(() => {
                    alert(`✅ Passage ${currentEq} - ${currentColor} envoyé ! (VMA +${ptsVMA}, Tir +${ptsTir})`);
                    resetUI();
                });
            });
        }

        function resetUI() {
            dureeMs = 0;
            document.getElementById('chronoDisplay').innerText = "00:00";
            document.getElementById('btnSend').disabled = true;
            document.getElementById('btnStart').disabled = false;
            document.getElementById('btnStop').disabled = true;
        }
    </script>
</body>
</html>