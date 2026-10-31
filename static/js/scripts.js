(() => {
    const form = document.getElementById('surveyForm');
    form.noValidate = true;
    const card = document.getElementById('card');
    const btn = document.getElementById('submitBtn');
    const modal = document.getElementById('successModal');
    const toast = document.getElementById('toast');
    const fill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const selects = [...form.querySelectorAll('select')];
    const customs = [];

    selects.forEach(sel => {
        sel.classList.add('enhanced');
        const wrap = document.createElement('div');
        wrap.className = 'select';

        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'select-trigger';
        trigger.innerHTML = '<span class="value placeholder"></span><i class="fa-solid fa-chevron-down chev"></i>';
        const valueEl = trigger.querySelector('.value');

        const menu = document.createElement('div');
        menu.className = 'select-menu';

        const options = [...sel.options].filter(o => !o.disabled);
        options.forEach((o, i) => {
            const item = document.createElement('div');
            item.className = 'select-option';
            item.style.setProperty('--n', i);
            item.textContent = o.textContent;
            item.dataset.value = o.value;
            item.addEventListener('click', () => choose(o.value, o.textContent));
            menu.appendChild(item);
        });

        const placeholder = sel.options[0] ? sel.options[0].textContent : 'Seçin';
        valueEl.textContent = placeholder;

        sel.parentNode.insertBefore(wrap, sel.nextSibling);
        wrap.append(trigger, menu);

        function choose(val, text) {
            sel.value = val;
            valueEl.textContent = text;
            valueEl.classList.remove('placeholder');
            menu.querySelectorAll('.select-option').forEach(el =>
                el.classList.toggle('selected', el.dataset.value === val));
            close();
            refresh();
        }

        function open() {
            customs.forEach(c => c.close());
            const rect = trigger.getBoundingClientRect();
            const need = Math.min(menu.scrollHeight, 260) + 20;
            wrap.classList.toggle('up', window.innerHeight - rect.bottom < need && rect.top > need);
            wrap.classList.add('open');
        }
        function close() { wrap.classList.remove('open'); }

        trigger.addEventListener('click', e => {
            e.stopPropagation();
            wrap.classList.contains('open') ? close() : open();
        });

        trigger.addEventListener('keydown', e => {
            const items = [...menu.children];
            let idx = items.findIndex(i => i.classList.contains('active'));
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                if (!wrap.classList.contains('open')) open();
                idx = e.key === 'ArrowDown' ? Math.min(idx + 1, items.length - 1) : Math.max(idx - 1, 0);
                items.forEach(i => i.classList.remove('active'));
                items[idx].classList.add('active');
                items[idx].scrollIntoView({ block: 'nearest' });
            } else if (e.key === 'Enter' && wrap.classList.contains('open') && idx > -1) {
                e.preventDefault();
                choose(items[idx].dataset.value, items[idx].textContent);
            } else if (e.key === 'Escape') close();
        });

        customs.push({ sel, wrap, close, reset() {
            valueEl.textContent = placeholder;
            valueEl.classList.add('placeholder');
            menu.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        }});
    });

    document.addEventListener('click', () => customs.forEach(c => c.close()));

    const fields = [...form.querySelectorAll('input[required], select[required]')];
    const groupOf = el => el.closest('.input-group');

    function isValid(el) {
        if (el.tagName === 'SELECT') return el.value !== '';
        if (el.value === '') return false;
        const v = parseFloat(el.value);
        if (isNaN(v)) return false;
        if (el.min !== '' && v < parseFloat(el.min)) return false;
        if (el.max !== '' && v > parseFloat(el.max)) return false;
        return true;
    }

    function refresh() {
        let done = 0;
        fields.forEach(el => {
            const ok = isValid(el);
            if (ok) done++;
            groupOf(el).classList.toggle('is-filled', ok);
            if (ok) groupOf(el).classList.remove('is-error');
        });
        fill.style.width = (done / fields.length * 100) + '%';
        progressText.textContent = done + ' / ' + fields.length;
    }
    form.addEventListener('input', refresh);

    if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
        card.addEventListener('mousemove', e => {
            const r = card.getBoundingClientRect();
            const x = (e.clientX - r.left) / r.width;
            const y = (e.clientY - r.top) / r.height;
            card.style.setProperty('--mx', x * 100 + '%');
            card.style.setProperty('--my', y * 100 + '%');
            card.style.transform = `rotateY(${(x - .5) * 5}deg) rotateX(${(.5 - y) * 5}deg)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    }

    btn.addEventListener('click', e => {
        const r = btn.getBoundingClientRect();
        const s = Math.max(r.width, r.height);
        const d = document.createElement('span');
        d.className = 'ripple';
        d.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
        btn.appendChild(d);
        setTimeout(() => d.remove(), 700);
    });

    function showToast(msg) {
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(showToast.t);
        showToast.t = setTimeout(() => toast.classList.remove('show'), 3500);
    }

    form.addEventListener('submit', async e => {
        e.preventDefault();
        if (btn.disabled) return;

        const bad = fields.filter(el => !isValid(el));
        if (bad.length) {
            bad.forEach(el => {
                const g = groupOf(el);
                g.classList.add('is-error');
                g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake');
            });
            groupOf(bad[0]).scrollIntoView({ behavior: 'smooth', block: 'center' });
            showToast('Zəhmət olmasa bütün xanaları düzgün doldurun');
            return;
        }

        btn.disabled = true;
        btn.classList.add('loading');

        try {
            const [res] = await Promise.all([
                fetch(form.action || window.location.href, { method: 'POST', body: new FormData(form) }),
                new Promise(r => setTimeout(r, 900))
            ]);
            if (!res.ok) throw new Error('server');

            btn.classList.remove('loading');
            btn.classList.add('done');
            setTimeout(() => { modal.classList.add('show'); modal.setAttribute('aria-hidden', 'false'); burst(); }, 500);
        } catch (err) {
            btn.classList.remove('loading');
            btn.disabled = false;
            showToast('Göndərmək alınmadı. Bir az sonra yenidən cəhd edin');
        }
    });

    function closeModal() {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        form.reset();
        customs.forEach(c => c.reset());
        btn.classList.remove('done');
        btn.disabled = false;
        refresh();
    }
    document.getElementById('modalClose').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) closeModal(); });

    refresh();

    const pc = document.getElementById('particles');
    const pctx = pc.getContext('2d');
    let pw, ph, dots = [];

    function sizeP() {
        pw = pc.width = innerWidth; ph = pc.height = innerHeight;
        dots = Array.from({ length: Math.min(70, Math.floor(pw * ph / 22000)) }, () => ({
            x: Math.random() * pw, y: Math.random() * ph,
            r: Math.random() * 1.8 + .4,
            vx: (Math.random() - .5) * .25, vy: -Math.random() * .35 - .05,
            a: Math.random() * .5 + .2
        }));
    }
    function tickP() {
        pctx.clearRect(0, 0, pw, ph);
        dots.forEach(d => {
            d.x += d.vx; d.y += d.vy;
            if (d.y < -5) { d.y = ph + 5; d.x = Math.random() * pw; }
            if (d.x < -5) d.x = pw + 5; if (d.x > pw + 5) d.x = -5;
            pctx.beginPath();
            pctx.arc(d.x, d.y, d.r, 0, 6.283);
            pctx.fillStyle = `rgba(165,180,252,${d.a})`;
            pctx.fill();
        });
        requestAnimationFrame(tickP);
    }
    sizeP(); addEventListener('resize', sizeP);
    if (!reduceMotion) tickP();

    const cc = document.getElementById('confetti');
    const cctx = cc.getContext('2d');
    let pieces = [], running = false;

    function burst() {
        if (reduceMotion) return;
        cc.width = innerWidth; cc.height = innerHeight;
        const colors = ['#6366f1', '#22d3ee', '#f472b6', '#34d399', '#fbbf24', '#ffffff'];
        for (let i = 0; i < 140; i++) {
            const ang = Math.random() * Math.PI * 2, sp = Math.random() * 12 + 4;
            pieces.push({
                x: cc.width / 2, y: cc.height / 2,
                vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 6,
                w: Math.random() * 8 + 5, h: Math.random() * 5 + 3,
                rot: Math.random() * 6, vr: (Math.random() - .5) * .4,
                c: colors[(Math.random() * colors.length) | 0], life: 1
            });
        }
        if (!running) { running = true; stepC(); }
    }
    function stepC() {
        cctx.clearRect(0, 0, cc.width, cc.height);
        pieces.forEach(p => {
            p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= .006;
            cctx.save();
            cctx.globalAlpha = Math.max(p.life, 0);
            cctx.translate(p.x, p.y); cctx.rotate(p.rot);
            cctx.fillStyle = p.c;
            cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
            cctx.restore();
        });
        pieces = pieces.filter(p => p.life > 0 && p.y < cc.height + 30);
        if (pieces.length) requestAnimationFrame(stepC);
        else { running = false; cctx.clearRect(0, 0, cc.width, cc.height); }
    }
})();