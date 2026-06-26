/* eslint-disable no-unused-vars, no-loop-func, no-useless-escape */
import { useState, useRef, useEffect } from "react";
import { useArticlesDB } from "./useArticlesDB";
import { useTaxonomy } from "./useTaxonomy";

// ── localStorage helpers ─────────────────────────────────
function loadState(key, fallback) {
  try { const r = localStorage.getItem(key); return r !== null ? JSON.parse(r) : fallback; }
  catch { return fallback; }
}
function saveState(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const ADMIN_PASSWORD = "fiambre12345";
const AREA_COLORS = ["#c0392b","#e67e22","#8e44ad","#27ae60","#2980b9","#d35400","#7f8c8d","#16a085","#f39c12","#2c3e50","#1abc9c","#e74c3c","#9b59b6"];
// ── Theme helpers ────────────────────────────────────────
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return {r,g,b};
}
function lighten(hex, pct) {
  const {r,g,b} = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255-c)*pct);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}
function darken(hex, pct) {
  const {r,g,b} = hexToRgb(hex);
  const mix = (c) => Math.round(c*(1-pct));
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}
function makeTheme(accent="#e8000d", bg="#ffffff") {
  return {
    bg,
    bgAlt: lighten(bg, -0.03) === bg ? "#fafafa" : lighten(accent, 0.97),
    border: accent,
    borderLight: lighten(accent, 0.7),
    borderFaint: lighten(accent, 0.88),
    text:"#1a1a1a",
    textMid:"#555",
    textFaint:"#999",
    red: accent,
    redLight: lighten(accent, 0.93),
  };
}
// C is set dynamically in App via useTheme — this default is used by components
let C = makeTheme();
const S = {
  sel:(v,dis)=>({background:C.bg,border:`1px solid ${v?C.border:C.borderLight}`,borderRadius:6,color:v?C.text:C.textFaint,padding:"9px 11px",fontSize:13,outline:"none",width:"100%",cursor:dis?"not-allowed":"pointer",opacity:dis?0.4:1}),
  inp:(v)=>({background:C.bg,border:`1px solid ${v?C.border:C.borderLight}`,borderRadius:6,color:C.text,padding:"9px 11px",fontSize:13,outline:"none",width:"100%"}),
  si:{background:C.bgAlt,border:`1px solid #fcc`,borderRadius:5,color:C.text,padding:"6px 10px",fontSize:12,outline:"none",width:"100%"},
};

// ── Admin Password Modal ──────────────────────────────────
function AdminModal({ onSuccess, onClose }) {
  const [pw, setPw] = useState(""), [err, setErr] = useState(false);
  const check = () => {
    if (pw === ADMIN_PASSWORD) { onSuccess(); }
    else { setErr(true); setPw(""); }
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.bg,border:`2px solid ${C.border}`,borderRadius:12,padding:"28px 28px",maxWidth:340,width:"100%"}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,marginBottom:4}}>🔒 Área de Administrador</div>
        <div style={{fontSize:12,color:C.textFaint,marginBottom:20}}>Introduz a password para aceder às configurações.</div>
        <label style={{display:"block",fontSize:9,letterSpacing:2,color:C.textFaint,marginBottom:5}}>PASSWORD</label>
        <input type="password" value={pw} onChange={e=>{setPw(e.target.value);setErr(false);}}
          onKeyDown={e=>e.key==="Enter"&&check()}
          autoFocus style={{...S.inp(!!pw),marginBottom:err?6:16,fontSize:15,letterSpacing:2}}/>
        {err&&<div style={{fontSize:11,color:C.red,marginBottom:12}}>Password incorreta.</div>}
        <div style={{display:"flex",gap:8}}>
          <button onClick={check} style={{flex:1,background:C.red,color:"#fff",border:"none",borderRadius:7,padding:"10px",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>Entrar</button>
          <button onClick={onClose} style={{background:C.bg,border:`1px solid ${C.border}`,color:C.textMid,borderRadius:7,padding:"10px 14px",cursor:"pointer",fontSize:12}}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Database View Modal (read-only for all users) ────────
function DatabaseViewModal({db, dbLoading, taxonomy, onClose, onQuickAdd}) {
  const { getNodeImage } = taxonomy;
  const getBestImg = (item) => item.imageUrl || (item.nodeId ? getNodeImage(item.nodeId) : null);
  const [search, setSearch] = useState("");
  const [sortAlpha, setSortAlpha] = useState(false);
  const { getPath } = taxonomy;
  const filteredRaw = db.filter(i => {
    const q = search.toLowerCase();
    return !q || [i.codigo,i.nome,i.descricao].some(v=>(v||"").toLowerCase().includes(q));
  });
  const filtered = sortAlpha ? [...filteredRaw].sort((a,b)=>a.nome.localeCompare(b.nome,"pt")) : filteredRaw;
  const leaves = db.reduce((acc,i)=>{
    if(i.nodeId && !acc.find(o=>o.id===i.nodeId)){
      const path = getPath(i.nodeId).join(" › ");
      acc.push({id:i.nodeId, path});
    }
    return acc;
  },[]).sort((a,b)=>a.path.localeCompare(b.path));

  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:12,width:"100%",maxWidth:700,maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 20px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          <div><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:C.text}}>◈ Base de Dados</div>
          <div style={{fontSize:11,color:C.textFaint,marginTop:1}}>{dbLoading?"A carregar...":`${db.length} artigos · consulta`}</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textFaint,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{padding:"12px 20px",borderBottom:`1px solid ${C.borderLight}`,flexShrink:0,display:"flex",gap:8,alignItems:"center"}}>
          <div style={{position:"relative",flex:1}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textFaint,fontSize:12}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar por código ou nome..." style={{...S.inp(false),paddingLeft:28}}/></div>
          <button onClick={()=>setSortAlpha(v=>!v)} style={{background:sortAlpha?C.red:C.bg,color:sortAlpha?"#fff":C.textMid,border:`1px solid ${sortAlpha?C.red:C.border}`,borderRadius:6,padding:"7px 12px",cursor:"pointer",fontSize:12,whiteSpace:"nowrap",flexShrink:0}}>A→Z</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"12px 20px"}}>
          {filtered.length===0
            ? <div style={{textAlign:"center",color:C.textFaint,padding:"36px",border:`1px dashed ${C.border}`,borderRadius:8,fontSize:12}}>{db.length===0?"Sem artigos na base de dados.":"Sem resultados."}</div>
            : <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
                <div style={{display:"grid",gridTemplateColumns:"44px 100px 1fr 1fr 80px",padding:"7px 12px",borderBottom:`1px solid ${C.border}`,fontSize:9,letterSpacing:2,color:C.textFaint,background:C.bgAlt}}>
                  <span></span><span>CÓDIGO</span><span>NOME</span><span>CATEGORIA</span><span></span>
                </div>
                {filtered.map((item,i)=>(
                  <div key={item.id} style={{display:"grid",gridTemplateColumns:"44px 100px 1fr 1fr 80px",padding:"7px 12px",borderBottom:i<filtered.length-1?`1px solid ${C.borderFaint}`:"none",alignItems:"center",background:C.bg}} className="rh">
                    <div style={{width:36,height:36,borderRadius:5,overflow:"hidden",background:C.bgAlt,border:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {getBestImg(item) ? <img src={getBestImg(item)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:16}}>📦</span>}
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.codigo}</span>
                    <div><div style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.nome}</div>{item.descricao&&<div style={{fontSize:10,color:C.textFaint}}>{item.descricao}</div>}</div>
                    <span style={{fontSize:10,color:C.textMid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.nodeId?getPath(item.nodeId).join(" › "):"—"}</span>
                    <div style={{display:"flex",justifyContent:"flex-end"}}>
                      <button onMouseDown={e=>{e.preventDefault();onQuickAdd(item);onClose();}} style={{background:C.redLight,border:`1px solid ${C.borderLight}`,color:C.red,borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,fontWeight:600}}>+ Usar</button>
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
    </div>
  );
}

// ── Admin Panel (password-protected: taxonomy + database edit) ──
function AdminPanel({taxonomy, db, dbLoading, onClose, onAdd, onUpdate, onDelete, onImport, notify}) {
  const [tab, setTab] = useState("estrutura");
  return (
    <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",padding:12}}>
      <div style={{background:C.bg,border:`2px solid ${C.border}`,borderRadius:12,width:"100%",maxWidth:900,maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderBottom:`1px solid ${C.border}`,flexShrink:0,background:C.redLight}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:C.red}}>🔒 Área de Administrador</div>
          <button onClick={onClose} style={{background:"none",border:"none",color:C.textFaint,cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{display:"flex",borderBottom:`1px solid ${C.border}`,flexShrink:0,overflowX:"auto"}}>
          <button className={`tab-btn${tab==="estrutura"?" active":""}`} onClick={()=>setTab("estrutura")}>⚙ Estrutura</button>
          <button className={`tab-btn${tab==="database"?" active":""}`} onClick={()=>setTab("database")}>◈ Base de Dados</button>
          <button className={`tab-btn${tab==="backup"?" active":""}`} onClick={()=>setTab("backup")}>💾 Backup</button>
        </div>
        <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {tab==="estrutura" && <TaxonomyPanel taxonomy={taxonomy} />}
          {tab==="database" && <DatabaseEditPanel db={db} dbLoading={dbLoading} taxonomy={taxonomy} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} onImport={onImport} notify={notify}/>}
          {tab==="backup" && <BackupPanel db={db} taxonomy={taxonomy} onImport={onImport} notify={notify}/>}
        </div>
      </div>
    </div>
  );
}

// ── Backup Panel ──────────────────────────────────────────
function BackupPanel({ db, taxonomy, onImport, notify }) {
  const { nodes } = taxonomy;
  const [confirmRestore, setConfirmRestore] = useState(false);
  const [restoreData, setRestoreData] = useState(null);
  const [restoreInfo, setRestoreInfo] = useState(null);

  const exportBackup = () => {
    const backup = {
      version: 1,
      date: new Date().toISOString(),
      artigos: db,
      estrutura: nodes,
    };
    const json = JSON.stringify(backup, null, 2);
    const blob = new Blob([json], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toLocaleDateString("pt-PT").replace(/\//g,"-");
    a.href = url; a.download = `materialtrack-backup-${dateStr}.json`; a.click();
    URL.revokeObjectURL(url);
    notify("Backup exportado!");
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (!data.artigos || !data.estrutura) throw new Error("Ficheiro inválido");
        setRestoreData(data);
        setRestoreInfo({
          date: data.date ? new Date(data.date).toLocaleString("pt-PT") : "desconhecida",
          artigos: data.artigos.length,
          nos: data.estrutura.length,
        });
        setConfirmRestore(true);
      } catch(err) {
        notify("Erro: ficheiro inválido ou corrompido", "err");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const confirmRestoreAction = async () => {
    if (!restoreData) return;
    try {
      // Restore articles (import as new — existing data stays, duplicates may appear)
      // For a clean restore the user should clear manually first
      const items = restoreData.artigos.map(({id, ...rest}) => rest);
      await onImport(items);
      notify(`Restauro concluído: ${items.length} artigos importados!`);
      setConfirmRestore(false);
      setRestoreData(null);
      setRestoreInfo(null);
    } catch(err) {
      notify("Erro no restauro: " + err.message, "err");
    }
  };

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px"}}>

      {/* Confirm restore modal */}
      {confirmRestore && restoreInfo && (
        <div style={{position:"fixed",inset:0,zIndex:2000,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:C.bg,border:`2px solid ${C.red}`,borderRadius:12,padding:"28px",maxWidth:380,width:"100%"}}>
            <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,marginBottom:8}}>⚠️ Confirmar restauro</div>
            <div style={{fontSize:13,color:C.textMid,marginBottom:16,lineHeight:1.7}}>
              Vais importar um backup de:<br/>
              <strong>Data:</strong> {restoreInfo.date}<br/>
              <strong>Artigos:</strong> {restoreInfo.artigos}<br/>
              <strong>Nós de estrutura:</strong> {restoreInfo.nos}<br/><br/>
              <strong style={{color:C.red}}>Atenção:</strong> os artigos serão adicionados à base de dados atual. Se quiserdes substituir completamente, apaga os artigos existentes primeiro.
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={confirmRestoreAction} style={{flex:1,background:C.red,color:"#fff",border:"none",borderRadius:7,padding:"11px",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>
                Confirmar restauro
              </button>
              <button onClick={()=>{setConfirmRestore(false);setRestoreData(null);setRestoreInfo(null);}}
                style={{background:C.bg,border:`1px solid ${C.border}`,color:C.textMid,borderRadius:7,padding:"11px 16px",cursor:"pointer",fontSize:12}}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{fontSize:11,color:C.textFaint,marginBottom:24,padding:"10px 14px",background:C.bgAlt,borderRadius:8,border:`1px solid ${C.borderLight}`,lineHeight:1.7}}>
        O backup inclui todos os <strong>artigos</strong> e a <strong>estrutura de categorias</strong>. Guarda o ficheiro num local seguro — podes usá-lo para restaurar a base de dados em caso de perda de dados.
      </div>

      {/* Export */}
      <div style={{marginBottom:28,padding:"20px",background:C.bg,border:`1px solid ${C.borderLight}`,borderRadius:10}}>
        <div style={{fontSize:10,letterSpacing:2,color:C.textFaint,marginBottom:6}}>EXPORTAR BACKUP</div>
        <div style={{fontSize:13,color:C.textMid,marginBottom:14,lineHeight:1.6}}>
          Descarrega um ficheiro <strong>.json</strong> com todos os artigos ({db.length}) e nós de estrutura ({nodes.length}).
        </div>
        <button onClick={exportBackup} style={{background:C.red,color:"#fff",border:"none",borderRadius:8,padding:"12px 24px",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,display:"flex",alignItems:"center",gap:8}}>
          ⬇ Exportar backup
        </button>
      </div>

      {/* Import */}
      <div style={{padding:"20px",background:C.bg,border:`1px solid ${C.borderLight}`,borderRadius:10}}>
        <div style={{fontSize:10,letterSpacing:2,color:C.textFaint,marginBottom:6}}>RESTAURAR BACKUP</div>
        <div style={{fontSize:13,color:C.textMid,marginBottom:14,lineHeight:1.6}}>
          Seleciona um ficheiro <strong>.json</strong> exportado anteriormente para restaurar os artigos.
        </div>
        <label style={{background:C.redLight,border:`1px solid ${C.border}`,color:C.red,borderRadius:8,padding:"12px 24px",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,display:"inline-flex",alignItems:"center",gap:8}}>
          ⬆ Selecionar ficheiro de backup
          <input type="file" accept=".json" onChange={handleFileSelect} style={{display:"none"}}/>
        </label>
      </div>
    </div>
  );
}

// ── Theme Panel ───────────────────────────────────────────
function ThemePanel({ accent, setAccent, themeBg, setThemeBg, notify }) {
  const presetAccents = ["#e8000d","#1d6ae5","#16a34a","#7c3aed","#ea580c","#0891b2","#be185d","#1a1a1a"];
  const presetBgs    = ["#ffffff","#f8f8f8","#f0f4ff","#f0fdf4","#fdf4ff","#fff7ed","#0f172a","#1e1e1e"];

  const reset = () => { setAccent("#e8000d"); setThemeBg("#ffffff"); notify("Tema reposto!"); };

  return (
    <div style={{flex:1,overflowY:"auto",padding:"20px"}}>
      <div style={{fontSize:11,color:C.textFaint,marginBottom:20}}>
        As cores são guardadas no teu dispositivo. Os teus colegas têm as suas próprias preferências.
      </div>

      {/* Accent color */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:10,letterSpacing:2,color:C.textFaint,marginBottom:12}}>COR PRINCIPAL</div>
        {/* Presets */}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
          {presetAccents.map(c=>(
            <button key={c} onClick={()=>setAccent(c)} style={{
              width:42,height:42,borderRadius:10,background:c,border:`3px solid ${accent===c?"#fff":"transparent"}`,
              outline:`2px solid ${accent===c?c:"transparent"}`,cursor:"pointer",flexShrink:0,transition:"all .15s"
            }}/>
          ))}
        </div>
        {/* Free picker */}
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <label style={{fontSize:12,color:C.textMid,marginBottom:0}}>Cor personalizada:</label>
          <input type="color" value={accent} onChange={e=>setAccent(e.target.value)}
            style={{width:52,height:44,borderRadius:8,border:`2px solid ${C.borderLight}`,cursor:"pointer",padding:2,background:"none"}}/>
          <span style={{fontSize:12,fontFamily:"monospace",color:C.textFaint}}>{accent}</span>
        </div>
      </div>

      {/* Background color */}
      <div style={{marginBottom:28}}>
        <div style={{fontSize:10,letterSpacing:2,color:C.textFaint,marginBottom:12}}>COR DE FUNDO</div>
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:14}}>
          {presetBgs.map(c=>(
            <button key={c} onClick={()=>setThemeBg(c)} style={{
              width:42,height:42,borderRadius:10,background:c,
              border:`3px solid ${themeBg===c?accent:"#ddd"}`,
              outline:`2px solid ${themeBg===c?accent:"transparent"}`,cursor:"pointer",flexShrink:0,transition:"all .15s"
            }}/>
          ))}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <label style={{fontSize:12,color:C.textMid,marginBottom:0}}>Cor personalizada:</label>
          <input type="color" value={themeBg} onChange={e=>setThemeBg(e.target.value)}
            style={{width:52,height:44,borderRadius:8,border:`2px solid ${C.borderLight}`,cursor:"pointer",padding:2,background:"none"}}/>
          <span style={{fontSize:12,fontFamily:"monospace",color:C.textFaint}}>{themeBg}</span>
        </div>
      </div>

      {/* Preview */}
      <div style={{marginBottom:24,padding:"14px 16px",background:C.redLight,border:`1px solid ${C.borderLight}`,borderRadius:10}}>
        <div style={{fontSize:10,letterSpacing:2,color:C.textFaint,marginBottom:10}}>PRÉVIA</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
          <button style={{background:accent,color:"#fff",border:"none",borderRadius:7,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"default"}}>Botão principal</button>
          <button style={{background:themeBg,color:"#1a1a1a",border:`1px solid ${accent}`,borderRadius:7,padding:"9px 16px",fontSize:12,cursor:"default"}}>Botão secundário</button>
          <span style={{fontSize:12,color:accent,fontWeight:700}}>Texto destaque</span>
        </div>
      </div>

      <button onClick={reset} style={{background:"none",border:`1px solid ${C.borderLight}`,color:C.textFaint,borderRadius:7,padding:"9px 16px",cursor:"pointer",fontSize:12}}>
        ↺ Repor cores originais
      </button>
    </div>
  );
}


function TaxonomyPanel({ taxonomy }) {
  const { nodes, loading, getChildren, addRoot, addNode, updateNode, deleteNode, saveNodeImage, reorderNodes } = taxonomy;
  const [editing, setEditing] = useState(null); // {id, name, label}
  const [adding, setAdding] = useState(null);   // parentId or "__root__"
  const [addForm, setAddForm] = useState({name:"", label:""});
  const confirmEdit = async () => {
    if (!editing || !editing.name.trim()) return;
    await updateNode(editing.id, editing.name, editing.label);
    setEditing(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apagar este nó e todos os seus filhos?")) await deleteNode(id);
  };

  const confirmAdd = async () => {
    if (!addForm.name.trim()) return;
    if (adding === "__root__") await addRoot(addForm.name, addForm.label);
    else await addNode(addForm.name, adding, addForm.label);
    setAdding(null); setAddForm({name:"", label:""});
  };

  const moveNode = async (nodeId, parentId, direction) => {
    const siblings = getChildren(parentId);
    const ids = siblings.map(n => n.id);
    const idx = ids.indexOf(nodeId);
    if (idx === -1) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= ids.length) return;
    ids.splice(idx, 1);
    ids.splice(newIdx, 0, nodeId);
    await reorderNodes(ids);
  };

  const renderNodes = (parentId = null, depth = 0) => {
    const children = getChildren(parentId);
    return children.map(node => {
      const isRoot = depth === 0;
      const siblings = getChildren(parentId);
      const nodeIdx = siblings.findIndex(n=>n.id===node.id);
      return (
        <div key={node.id} style={{marginLeft: depth * 18}}>
          {/* Node row */}
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"5px 8px",borderRadius:6,marginBottom:2,
            background:isRoot?C.redLight:"transparent",
            border:`1px solid ${isRoot?C.borderLight:"transparent"}`}}>

            {editing && editing.id === node.id ? (
              <div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}>
                <input autoFocus value={editing.name}
                  onChange={e=>setEditing(v=>({...v,name:e.target.value}))}
                  onKeyDown={e=>{if(e.key==="Enter")confirmEdit();if(e.key==="Escape")setEditing(null);}}
                  placeholder="Nome..." style={{...S.si,fontSize:12}}/>
                <input value={editing.label}
                  onChange={e=>setEditing(v=>({...v,label:e.target.value}))}
                  onKeyDown={e=>{if(e.key==="Enter")confirmEdit();if(e.key==="Escape")setEditing(null);}}
                  placeholder={`Etiqueta dos filhos (ex: "Tipo", "Marca")...`} style={{...S.si,fontSize:11}}/>
                <div style={{display:"flex",gap:6}}>
                  <button onClick={confirmEdit} style={{background:C.red,color:"#fff",border:"none",borderRadius:5,padding:"4px 12px",cursor:"pointer",fontSize:11,fontWeight:700}}>Guardar</button>
                  <button onClick={()=>setEditing(null)} style={{background:"none",border:`1px solid ${C.borderLight}`,borderRadius:5,padding:"4px 8px",cursor:"pointer",fontSize:11,color:C.textFaint}}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{flex:1,minWidth:0,display:"flex",alignItems:"center",gap:8}}>
                {node.imageUrl
                  ? <img src={node.imageUrl} alt="" style={{width:28,height:28,borderRadius:4,objectFit:"cover",border:`1px solid ${C.borderLight}`,flexShrink:0}}/>
                  : <div style={{width:28,height:28,borderRadius:4,background:C.bgAlt,border:`1px dashed ${C.borderLight}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>📷</div>
                }
                <div>
                  <span style={{fontSize:12,color:C.text,fontWeight:isRoot?700:400}}>{node.name}</span>
                  {node.label && <span style={{fontSize:10,color:C.textFaint,marginLeft:6,background:"#f0f0f0",borderRadius:4,padding:"1px 6px"}}>{node.label} →</span>}
                </div>
              </div>
            )}

            {!editing && <div style={{display:"flex",gap:2,flexShrink:0,alignItems:"center"}}>
              {/* Up/Down reorder */}
              <button onClick={()=>moveNode(node.id,parentId,-1)} disabled={nodeIdx===0}
                style={{background:"none",border:"none",color:nodeIdx===0?C.borderLight:C.textFaint,cursor:nodeIdx===0?"default":"pointer",fontSize:13,padding:"2px 3px",lineHeight:1}}
                title="Mover para cima">↑</button>
              <button onClick={()=>moveNode(node.id,parentId,1)} disabled={nodeIdx===siblings.length-1}
                style={{background:"none",border:"none",color:nodeIdx===siblings.length-1?C.borderLight:C.textFaint,cursor:nodeIdx===siblings.length-1?"default":"pointer",fontSize:13,padding:"2px 3px",lineHeight:1}}
                title="Mover para baixo">↓</button>
              {/* Image upload */}
              <label title="Imagem" style={{cursor:"pointer",padding:"2px 4px",fontSize:12,color:node.imageUrl?C.red:C.textFaint}}>
                📷
                <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{
                  const file = e.target.files[0]; if(!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const img = new Image();
                    img.onload = () => {
                      const MAX=400, scale=Math.min(1,MAX/Math.max(img.width,img.height));
                      const canvas=document.createElement("canvas");
                      canvas.width=Math.round(img.width*scale); canvas.height=Math.round(img.height*scale);
                      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
                      saveNodeImage(node.id, canvas.toDataURL("image/jpeg",0.75));
                    };
                    img.src=ev.target.result;
                  };
                  reader.readAsDataURL(file);
                  e.target.value="";
                }}/>
              </label>
              {node.imageUrl && <button onClick={()=>saveNodeImage(node.id,"")} title="Remover imagem"
                style={{background:"none",border:"none",color:C.textFaint,cursor:"pointer",fontSize:10,padding:"2px 3px"}}>🗑</button>}
              <button onClick={()=>{setAdding(node.id);setAddForm({name:"",label:""});}} title="Adicionar filho"
                style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:"2px 5px",lineHeight:1}}>+</button>
              <button onClick={()=>setEditing({id:node.id,name:node.name,label:node.label||""})} title="Editar"
                style={{background:"none",border:"none",color:C.textFaint,cursor:"pointer",fontSize:12,padding:"2px 4px"}}>✎</button>
              <button onClick={()=>handleDelete(node.id)} title="Apagar"
                style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:12,padding:"2px 4px"}}>✕</button>
            </div>}
          </div>

          {/* Add child form */}
          {adding === node.id && (
            <div style={{marginLeft:18,marginBottom:6,marginTop:2,padding:"10px 12px",background:C.bg,border:`1px solid ${C.borderLight}`,borderRadius:8}}>
              <div style={{fontSize:9,letterSpacing:2,color:C.red,marginBottom:8}}>ADICIONAR FILHO DE "{node.name}"</div>
              <input value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))}
                placeholder="Nome do nó (ex: Aventics)..." style={{...S.si,width:"100%",marginBottom:6,fontSize:12}}/>
              <input value={addForm.label} onChange={e=>setAddForm(f=>({...f,label:e.target.value}))}
                onKeyDown={e=>{if(e.key==="Enter")confirmAdd();if(e.key==="Escape")setAdding(null);}}
                placeholder={`Etiqueta dos filhos deste nó (ex: "Tamanho")...`} style={{...S.si,width:"100%",marginBottom:8,fontSize:11}}/>
              <div style={{display:"flex",gap:6}}>
                <button onClick={confirmAdd} disabled={!addForm.name.trim()}
                  style={{background:C.red,color:"#fff",border:"none",borderRadius:5,padding:"5px 14px",cursor:"pointer",fontSize:11,fontWeight:700}}>Adicionar</button>
                <button onClick={()=>setAdding(null)}
                  style={{background:"none",border:`1px solid ${C.borderLight}`,borderRadius:5,padding:"5px 10px",cursor:"pointer",fontSize:11,color:C.textFaint}}>Cancelar</button>
              </div>
            </div>
          )}
          {renderNodes(node.id, depth + 1)}
        </div>
      );
    });
  };

  return (
    <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
      <div style={{fontSize:11,color:C.textFaint,marginBottom:16,padding:"8px 12px",background:C.bgAlt,borderRadius:6,border:`1px solid ${C.borderLight}`}}>
        Cada nó tem um <strong>nome</strong> e uma <strong>etiqueta</strong> que define como se chamam os seus filhos.<br/>
        Ex: nó "Banjo" com etiqueta "Tipo" → o próximo nível chama-se "TIPO".
      </div>
      {loading ? <div style={{textAlign:"center",color:C.textFaint,padding:40}}>A carregar...</div>
        : <>
            {renderNodes(null, 0)}
            {adding !== "__root__"
              ? <button onClick={()=>{setAdding("__root__");setAddForm({name:"",label:""});}}
                  style={{marginTop:12,width:"100%",background:C.redLight,border:`1px solid ${C.border}`,color:C.red,borderRadius:7,padding:"9px",cursor:"pointer",fontSize:12,fontWeight:600}}>
                  + Adicionar categoria raiz
                </button>
              : <div style={{marginTop:8,padding:"12px",background:C.bg,border:`1px solid ${C.border}`,borderRadius:8}}>
                  <div style={{fontSize:9,letterSpacing:2,color:C.red,marginBottom:8}}>NOVA CATEGORIA RAIZ</div>
                  <input value={addForm.name} onChange={e=>setAddForm(f=>({...f,name:e.target.value}))}
                    placeholder="Nome (ex: Ar comprimido)..." style={{...S.si,width:"100%",marginBottom:6}}/>
                  <input value={addForm.label} onChange={e=>setAddForm(f=>({...f,label:e.target.value}))}
                    onKeyDown={e=>{if(e.key==="Enter")confirmAdd();if(e.key==="Escape")setAdding(null);}}
                    placeholder={`Etiqueta dos filhos (ex: "Acessórios")...`} style={{...S.si,width:"100%",marginBottom:8,fontSize:11}}/>
                  <div style={{display:"flex",gap:6}}>
                    <button onClick={confirmAdd} disabled={!addForm.name.trim()}
                      style={{background:C.red,color:"#fff",border:"none",borderRadius:5,padding:"6px 14px",cursor:"pointer",fontSize:12,fontWeight:700}}>Adicionar</button>
                    <button onClick={()=>setAdding(null)}
                      style={{background:"none",border:`1px solid ${C.borderLight}`,borderRadius:5,padding:"6px 10px",cursor:"pointer",color:C.textFaint,fontSize:12}}>Cancelar</button>
                  </div>
                </div>
            }
          </>
      }
    </div>
  );
}

// ── Database Edit Panel (inside Admin) ───────────────────
function DatabaseEditPanel({db, dbLoading, taxonomy, onAdd, onUpdate, onDelete, onImport, notify}) {
  const [form, setForm] = useState({codigo:"",nome:"",descricao:"",selPath:[],imageUrl:""});
  const [imgPreview, setImgPreview] = useState("");
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [importText, setImportText] = useState(""), [sI, setSI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keepPath, setKeepPath] = useState(true); // keep category selection after save
  const [sortAlpha, setSortAlpha] = useState(false); // sort list alphabetically
  const { getPath, getLeaves, nodes, getChildren, getLevelLabel, getNodeImage } = taxonomy;
  const getBestImg = (item) => item?.imageUrl || (item?.nodeId ? getNodeImage(item.nodeId) : null);

  const leaves = getLeaves();
  const leafOptions = leaves.map(l=>({id:l.id,path:getPath(l.id).join(" › ")})).sort((a,b)=>a.path.localeCompare(b.path));
  const canSave = form.codigo.trim() && form.nome.trim();

  const currentNodeId = form.selPath.length > 0 ? form.selPath[form.selPath.length-1] : "";

  // Resize image to max 400px and convert to base64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 400;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const b64 = canvas.toDataURL("image/jpeg", 0.75);
        setForm(f => ({...f, imageUrl: b64}));
        setImgPreview(b64);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const saveItem = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const data = {codigo:form.codigo.trim(),nome:form.nome.trim(),descricao:form.descricao,nodeId:currentNodeId,imageUrl:form.imageUrl||""};
      if (editId !== null) { await onUpdate(editId, data); setEditId(null); }
      else { await onAdd(data); }
      // Keep path if option is on, otherwise reset everything
      setForm(f => ({codigo:"",nome:"",descricao:"",selPath: keepPath ? f.selPath : [],imageUrl:""}));
      setImgPreview("");
      notify("Artigo guardado!");
    } catch(e) { notify("Erro: "+e.message,"err"); }
    setSaving(false);
  };

  const startEdit = item => {
    let selPath = [];
    if (item.nodeId) {
      let cur = nodes.find(n => n.id === item.nodeId);
      while (cur) { selPath.unshift(cur.id); cur = cur.parentId ? nodes.find(n=>n.id===cur.parentId) : null; }
    }
    setForm({codigo:item.codigo,nome:item.nome,descricao:item.descricao||"",selPath,imageUrl:item.imageUrl||""});
    setImgPreview(item.imageUrl||"");
    setEditId(item.id);
  };

  const delItem = async id => {
    try { await onDelete(id); if(editId===id){setEditId(null);setForm({codigo:"",nome:"",descricao:"",selPath:[]});} notify("Apagado!"); }
    catch(e) { notify("Erro: "+e.message,"err"); }
  };

  const handleImport = async () => {
    const lines_ = importText.trim().split("\n").filter(Boolean);
    const newItems = lines_.map(line=>{const p=line.split(",").map(s=>s.trim().replace(/^"|"$/g,""));return p[0]&&p[1]?{codigo:p[0],nome:p[1],descricao:p[2]||"",nodeId:""}:null;}).filter(Boolean);
    try { await onImport(newItems); setImportText(""); setSI(false); notify(`${newItems.length} artigos importados!`); }
    catch(e) { notify("Erro: "+e.message,"err"); }
  };

  const filteredRaw = db.filter(i=>{const q=search.toLowerCase();return !q||[i.codigo,i.nome,i.descricao].some(v=>(v||"").toLowerCase().includes(q));});
  const filtered = sortAlpha ? [...filteredRaw].sort((a,b)=>a.nome.localeCompare(b.nome,"pt")) : filteredRaw;

  // Build cascade levels for the form
  const buildLevels = () => {
    const levels = [];
    // First level: root categories
    const rootNodes = getChildren(null);
    if (rootNodes.length === 0) return levels;
    levels.push({ parentId: null, options: rootNodes, selectedId: form.selPath[0] || "" });
    for (let i = 0; i < form.selPath.length; i++) {
      const children = getChildren(form.selPath[i]);
      if (children.length === 0) break;
      levels.push({ parentId: form.selPath[i], options: children, selectedId: form.selPath[i+1] || "" });
      if (!form.selPath[i+1]) break;
    }
    return levels;
  };

  const handleLevelSelect = (levelIndex, nodeId) => {
    const newPath = form.selPath.slice(0, levelIndex);
    if (nodeId) newPath.push(nodeId);
    setForm(f => ({...f, selPath: newPath}));
  };

  const levels = buildLevels();

  return (
    <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column"}}>
      {sI && <div style={{padding:"12px 20px",background:C.bgAlt,borderBottom:`1px solid ${C.borderLight}`,flexShrink:0}}>
        <div style={{fontSize:10,color:C.textFaint,marginBottom:6,letterSpacing:1}}>FORMATO: codigo,nome,descricao</div>
        <textarea value={importText} onChange={e=>setImportText(e.target.value)} rows={3}
          placeholder={"ART001,Cotovelo M/M 1/8,\nART002,União 1/4,"}
          style={{...S.inp(false),width:"100%",resize:"vertical",lineHeight:1.5,fontSize:12,marginBottom:8}}/>
        <button onClick={handleImport} disabled={!importText.trim()}
          style={{background:C.red,color:"#fff",border:"none",borderRadius:6,padding:"7px 16px",cursor:"pointer",fontSize:12}}>Importar</button>
      </div>}

      <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.borderLight}`,background:C.bgAlt,flexShrink:0}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div style={{fontSize:9,letterSpacing:2,color:C.red}}>{editId!==null?"✎ EDITAR":"+ NOVO ARTIGO"}</div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <button onClick={()=>setKeepPath(v=>!v)} style={{background:keepPath?C.red:C.bg,color:keepPath?"#fff":C.textMid,border:`1px solid ${keepPath?C.red:C.border}`,borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11,whiteSpace:"nowrap"}} title="Manter seleção de categorias após guardar">
              📌 {keepPath?"Manter categoria":"Não manter"}
            </button>
            <button onClick={()=>setSI(v=>!v)} style={{background:C.redLight,border:`1px solid ${C.border}`,color:C.red,borderRadius:6,padding:"5px 10px",cursor:"pointer",fontSize:11}}>↑ CSV</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"110px 1fr 1fr",gap:10,marginBottom:10}}>
          <div><label>CÓDIGO *</label><input value={form.codigo} onChange={e=>setForm(f=>({...f,codigo:e.target.value}))} placeholder="ART001" style={S.inp(!!form.codigo)}/></div>
          <div><label>NOME *</label><input value={form.nome} onChange={e=>setForm(f=>({...f,nome:e.target.value}))} placeholder="Nome do artigo" style={S.inp(!!form.nome)}/></div>
          <div><label>DESCRIÇÃO</label><input value={form.descricao} onChange={e=>setForm(f=>({...f,descricao:e.target.value}))} placeholder="Detalhe opcional" style={S.inp(!!form.descricao)}/></div>
        </div>
        {/* Image upload */}
        <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:12}}>
          <div>
            <label>IMAGEM (opcional)</label>
            <input type="file" accept="image/*" onChange={handleImageUpload} style={{display:"none"}} id="img-upload"/>
            <label htmlFor="img-upload" style={{display:"inline-flex",alignItems:"center",gap:6,background:C.redLight,border:`1px solid ${C.borderLight}`,color:C.red,borderRadius:7,padding:"7px 12px",cursor:"pointer",fontSize:11,fontWeight:600,marginBottom:0}}>
              📷 {imgPreview?"Trocar imagem":"Adicionar imagem"}
            </label>
          </div>
          {imgPreview&&(
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <img src={imgPreview} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:6,border:`1px solid ${C.borderLight}`}}/>
              <button onClick={()=>{setImgPreview("");setForm(f=>({...f,imageUrl:""}));}} style={{background:"none",border:"none",color:C.red,cursor:"pointer",fontSize:16}}>✕</button>
            </div>
          )}
        </div>
        {/* Cascade selector */}
        <div style={{marginBottom:10}}>
          <label>LOCALIZAÇÃO NA ESTRUTURA (opcional)</label>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {levels.map((level, i) => {
              const lbl = getLevelLabel(level.parentId);
              return (
                <select key={i} value={level.selectedId} onChange={e=>handleLevelSelect(i, e.target.value)} style={S.sel(!!level.selectedId)}>
                  <option value="">{lbl}: selecionar...</option>
                  {level.options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              );
            })}
          </div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <button onClick={saveItem} disabled={!canSave||saving}
            style={{background:canSave?C.red:"#ddd",color:"#fff",border:"none",borderRadius:7,padding:"10px 16px",cursor:canSave?"pointer":"not-allowed",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>
            {saving?"...":(editId!==null?"Guardar":"Adicionar")}
          </button>
          {editId!==null&&<button onClick={()=>{setEditId(null);setForm({codigo:"",nome:"",descricao:"",selPath:[],imageUrl:""});setImgPreview("");}}
            style={{background:C.bg,border:`1px solid ${C.border}`,color:C.textMid,borderRadius:7,padding:"10px 12px",cursor:"pointer",fontSize:12}}>✕</button>}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"12px 20px"}}>
        <div style={{marginBottom:12,display:"flex",gap:8,alignItems:"center"}}>
          <div style={{position:"relative",flex:1}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textFaint,fontSize:12}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..." style={{...S.inp(false),paddingLeft:28,fontSize:12}}/></div>
          <button onClick={()=>setSortAlpha(v=>!v)} style={{background:sortAlpha?C.red:C.bg,color:sortAlpha?"#fff":C.textMid,border:`1px solid ${sortAlpha?C.red:C.border}`,borderRadius:6,padding:"7px 12px",cursor:"pointer",fontSize:12,whiteSpace:"nowrap",flexShrink:0}} title="Ordenar alfabeticamente">
            A→Z
          </button>
        </div>
        {filtered.length===0
          ? <div style={{textAlign:"center",color:C.textFaint,padding:"24px",border:`1px dashed ${C.border}`,borderRadius:8,fontSize:12}}>{db.length===0?"Sem artigos. Adiciona acima.":"Sem resultados."}</div>
          : <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
              <div style={{display:"grid",gridTemplateColumns:"44px 100px 1fr 1fr 70px",padding:"7px 12px",borderBottom:`1px solid ${C.border}`,fontSize:9,letterSpacing:2,color:C.textFaint,background:C.bgAlt}}>
                <span></span><span>CÓDIGO</span><span>NOME</span><span>CAMINHO</span><span></span>
              </div>
              {filtered.map((item,i)=>(
                <div key={item.id} style={{display:"grid",gridTemplateColumns:"44px 100px 1fr 1fr 70px",padding:"7px 12px",borderBottom:i<filtered.length-1?`1px solid ${C.borderFaint}`:"none",alignItems:"center",background:editId===item.id?C.redLight:C.bg}} className="rh">
                  <div style={{width:36,height:36,borderRadius:5,overflow:"hidden",background:C.bgAlt,border:`1px solid ${C.borderLight}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    {getBestImg(item) ? <img src={getBestImg(item)} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:16}}>📦</span>}
                  </div>
                  <span style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.codigo}</span>
                  <div><div style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.nome}</div>{item.descricao&&<div style={{fontSize:10,color:C.textFaint}}>{item.descricao}</div>}</div>
                  <span style={{fontSize:10,color:C.textMid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.nodeId?getPath(item.nodeId).join(" › "):"—"}</span>
                  <div style={{display:"flex",justifyContent:"flex-end",gap:4}}>
                    <button onClick={()=>startEdit(item)} className="bh" style={{background:"none",border:"none",cursor:"pointer",color:C.textFaint,fontSize:13,padding:"3px 5px"}}>✎</button>
                    <button onClick={()=>delItem(item.id)} className="bh" style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:13,padding:"3px 5px"}}>✕</button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
    </div>
  );
}

// ── Article Search ────────────────────────────────────────
function ArticleSearch({db, taxonomy, value, onChange, onSelect, onQuickAdd, getArticleImage}){
  const [open,setOpen]=useState(false);
  const { getPath } = taxonomy;
  const sugg = value.trim().length>0
    ? db.filter(i=>[i.codigo,i.nome,i.descricao].some(v=>(v||"").toLowerCase().includes(value.toLowerCase())))
        .sort((a,b)=>a.nome.localeCompare(b.nome,"pt")).slice(0,8)
    : [];
  useEffect(()=>setOpen(sugg.length>0),[sugg.length]);
  return(
    <div style={{position:"relative"}}>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder="Pesquisar por código ou nome..." style={{...S.inp(!!value),paddingLeft:32}} onFocus={()=>sugg.length>0&&setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),150)}/>
      <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textFaint,fontSize:13}}>⌕</span>
      {open&&sugg.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,marginTop:3,overflow:"hidden",boxShadow:"0 6px 20px rgba(0,0,0,.1)"}}>
          {sugg.map(item=>{
            const img = getArticleImage ? getArticleImage(item) : item.imageUrl;
            return (
            <div key={item.id} style={{display:"flex",alignItems:"stretch",borderBottom:`1px solid ${C.borderFaint}`}} className="suggest-row">
              <div onMouseDown={e=>{e.preventDefault();onSelect(item);setOpen(false);}} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",cursor:"pointer",flex:1,minWidth:0}}>
                <div style={{width:40,height:40,borderRadius:6,overflow:"hidden",background:C.bgAlt,border:`1px solid ${C.borderLight}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  {img ? <img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:18}}>📦</span>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <span style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:"monospace"}}>{item.codigo}</span>
                  <div style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.nome}</div>
                  {item.nodeId&&<div style={{fontSize:10,color:C.textFaint}}>{getPath(item.nodeId).join(" › ")}</div>}
                </div>
              </div>
              <div onMouseDown={e=>{e.preventDefault();onQuickAdd(item);setOpen(false);}} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"0 14px",cursor:"pointer",background:C.redLight,borderLeft:`1px solid ${C.borderLight}`,color:C.red,fontSize:12,fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>+ Adicionar</div>
            </div>
          );})}
        </div>
      )}
    </div>
  );
}

// ── Tree Selector (variable depth, per-node labels) ─────
function TreeSelector({ taxonomy, value, onChange }) {
  const { getChildren, nodes, getLevelLabel } = taxonomy;

  const buildLevels = () => {
    const levels = [];
    const rootNodes = getChildren(null);
    if (rootNodes.length === 0) return levels;
    // Level 0: root nodes, label = "FAMÍLIA"
    levels.push({ parentId: null, options: rootNodes, selectedId: value[0] || "" });
    for (let i = 0; i < value.length; i++) {
      const children = getChildren(value[i]);
      if (children.length === 0) break;
      // Label comes from the selected node's "label" field
      levels.push({ parentId: value[i], options: children, selectedId: value[i+1] || "" });
      if (!value[i+1]) break;
    }
    return levels;
  };

  const handleSelect = (levelIndex, nodeId) => {
    const newPath = value.slice(0, levelIndex);
    if (nodeId) newPath.push(nodeId);
    onChange(newPath);
  };

  const levels = buildLevels();

  if (nodes.length === 0) return (
    <div style={{fontSize:12,color:C.textFaint,padding:"10px",background:C.bgAlt,borderRadius:6,border:`1px solid ${C.borderLight}`}}>
      Sem categorias configuradas. O administrador deve adicionar categorias nas Configurações.
    </div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {levels.map((level, i) => {
        const lbl = getLevelLabel(level.parentId);
        return (
          <div key={i}>
            <label style={{display:"block",fontSize:9,letterSpacing:2,color:C.textFaint,marginBottom:4}}>{lbl}</label>
            <select value={level.selectedId} onChange={e=>handleSelect(i, e.target.value)} style={S.sel(!!level.selectedId)}>
              <option value="">Selecionar...</option>
              {level.options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
          </div>
        );
      })}
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────
export default function App() {
  const taxonomy = useTaxonomy();
  const { items: db, loading: dbLoading, addItem: dbAdd, updateItem: dbUpdate, deleteItem: dbDelete, importItems: dbImport } = useArticlesDB();
  const { getPath, getChildren, nodes, getNodeImage } = taxonomy;

  // Get best image for an article: own image → node image → null
  const getArticleImage = (item) => {
    if (item?.imageUrl) return item.imageUrl;
    if (item?.nodeId) return getNodeImage(item.nodeId);
    return null;
  };

  // Theme
  const [accent, setAccent] = useState(() => loadState("mt_accent","#e8000d"));
  const [themeBg, setThemeBg] = useState(() => loadState("mt_bg","#ffffff"));
  C = makeTheme(accent, themeBg);
  useEffect(()=>saveState("mt_accent",accent),[accent]);
  useEffect(()=>saveState("mt_bg",themeBg),[themeBg]);

  const [projeto, setProjeto] = useState(() => loadState("mt_projeto",""));
  const [pI, setPI] = useState(() => loadState("mt_projeto",""));
  const [eP, setEP] = useState(() => loadState("mt_projeto","")==="");
  const [materiais, setMateriais] = useState(() => loadState("mt_materiais",[]));
  const nextId = useRef(loadState("mt_nextId",1));

  // Selection path (array of nodeIds)
  const [selPath, setSelPath] = useState([]);

  // Article dropdown + qty
  const [selId, setSelId] = useState("");
  const [qtdDrop, setQtdDrop] = useState("");

  // Manual entry
  const [manNome, setManNome] = useState("");
  const [mCod, setMCod] = useState("");
  const [mQtd, setMQtd] = useState("");

  // Quick add
  const [quickItem, setQuickItem] = useState(null);
  const [qtdQuick, setQtdQuick] = useState("");
  const [articleSearch, setArticleSearch] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState(null);
  const [modal, setModal] = useState(null); // "database" | "taxonomy" | "admin"
  const [activeTab, setActiveTab] = useState("materiais");
  const [confirmClear, setConfirmClear] = useState(false);
  const [notas, setNotas] = useState(() => loadState("mt_notas",[]));
  const nextNoteId = useRef(loadState("mt_nextNoteId",1));
  const [notaForm, setNotaForm] = useState({titulo:"",texto:""});
  const [eNId, setENId] = useState(null);

  const qtdDropRef = useRef(null);
  const qtdQuickRef = useRef(null);

  useEffect(()=>saveState("mt_projeto",projeto),[projeto]);
  useEffect(()=>saveState("mt_materiais",materiais),[materiais]);
  useEffect(()=>saveState("mt_nextId",nextId.current));
  useEffect(()=>saveState("mt_notas",notas),[notas]);
  useEffect(()=>saveState("mt_nextNoteId",nextNoteId.current));

  const notify = (msg,type="ok") => { setNotification({msg,type}); setTimeout(()=>setNotification(null),2500); };

  // Current leaf node
  const isLeaf = (nodeId) => nodeId && getChildren(nodeId).length === 0;
  const currentLeafId = selPath.length > 0 && isLeaf(selPath[selPath.length-1]) ? selPath[selPath.length-1] : null;

  // Articles filtered to current leaf
  const dbInLeaf = currentLeafId
    ? db.filter(i => !i.nodeId || i.nodeId === currentLeafId)
    : db;

  const selectedDbItem = selId ? db.find(i=>String(i.id)===String(selId))||null : null;

  const addFromDropdown = () => {
    if (!selectedDbItem||!qtdDrop||Number(qtdDrop)<=0) return;
    const id = nextId.current++;
    const path = selectedDbItem.nodeId ? getPath(selectedDbItem.nodeId) : selPath.map(nid=>nodes.find(n=>n.id===nid)?.name||"");
    setMateriais(ms=>[...ms,{id,path,nome:selectedDbItem.nome,codigoArtigo:selectedDbItem.codigo,dbItemId:String(selectedDbItem.id),quantidade:Number(qtdDrop)}]);
    notify(`"${selectedDbItem.nome}" adicionado!`);
    setSelId(""); setQtdDrop("");
    setTimeout(()=>qtdDropRef.current?.focus(),60);
  };

  const addManual = () => {
    if (!manNome.trim()||!mQtd||Number(mQtd)<=0) return;
    const id = nextId.current++;
    const path = selPath.map(nid=>nodes.find(n=>n.id===nid)?.name||"");
    setMateriais(ms=>[...ms,{id,path,nome:manNome.trim(),codigoArtigo:mCod||"",dbItemId:null,quantidade:Number(mQtd)}]);
    notify("Material adicionado!");
    setManNome(""); setMCod(""); setMQtd("");
  };

  const handleDelete = id => setMateriais(ms=>ms.filter(m=>m.id!==id));
  const handleEdit = m => { setQuickItem({...m,_editing:true}); setQtdQuick(String(m.quantidade)); };

  const onSelectArticle = item => {
    if (item.nodeId) {
      const path = getPath(item.nodeId);
      // Rebuild selPath from nodeId
      const buildPath = (nodeId) => {
        const pathIds = [];
        let cur = nodes.find(n=>n.id===nodeId);
        while(cur) { pathIds.unshift(cur.id); cur = cur.parentId ? nodes.find(n=>n.id===cur.parentId) : null; }
        return pathIds;
      };
      setSelPath(buildPath(item.nodeId));
    }
    setSelId(String(item.id));
    setArticleSearch("");
    setTimeout(()=>qtdDropRef.current?.focus(),80);
  };

  const onQuickAdd = item => { setQuickItem(item); setQtdQuick(""); setTimeout(()=>qtdQuickRef.current?.focus(),80); };

  const confirmQuickAdd = () => {
    if (!quickItem||!qtdQuick||Number(qtdQuick)<=0) return;
    if (quickItem._editing) {
      setMateriais(ms=>ms.map(m=>m.id===quickItem.id?{...m,quantidade:Number(qtdQuick)}:m));
      notify("Atualizado!");
    } else {
      const id = nextId.current++;
      const path = quickItem.nodeId ? getPath(quickItem.nodeId) : (quickItem.path||[]);
      setMateriais(ms=>[...ms,{id,path,nome:quickItem.nome,codigoArtigo:quickItem.codigo||quickItem.codigoArtigo||"",dbItemId:String(quickItem.id)||null,quantidade:Number(qtdQuick)}]);
      notify(`"${quickItem.nome}" adicionado!`);
    }
    setQuickItem(null); setQtdQuick(""); setArticleSearch("");
  };

  const saveNota = () => {
    if (!notaForm.texto.trim()) return;
    const date = new Date().toLocaleDateString("pt-PT");
    if (eNId!==null) { setNotas(ns=>ns.map(n=>n.id===eNId?{...n,...notaForm,data:date}:n)); setENId(null); }
    else { const id=nextNoteId.current++; setNotas(ns=>[{id,...notaForm,data:date},...ns]); }
    notify("Nota guardada!"); setNotaForm({titulo:"",texto:""});
  };
  const editNota = n => { setNotaForm({titulo:n.titulo,texto:n.texto}); setENId(n.id); };
  const deleteNota = id => { setNotas(ns=>ns.filter(n=>n.id!==id)); if(eNId===id){setENId(null);setNotaForm({titulo:"",texto:""});} };

  const [groupSame, setGroupSame] = useState(() => loadState("mt_groupSame", false));
  useEffect(()=>saveState("mt_groupSame", groupSame),[groupSame]);

  const filtered = materiais.filter(m => {
    const q = search.toLowerCase();
    return !q || [m.nome,m.codigoArtigo,...(m.path||[])].some(v=>(v||"").toLowerCase().includes(q));
  });

  // Merge duplicates when groupSame is active
  const displayList = groupSame ? (() => {
    const map = {};
    filtered.forEach(m => {
      const key = (m.codigoArtigo && m.codigoArtigo.trim()) ? m.codigoArtigo.trim() : m.nome.trim();
      if (map[key]) {
        map[key] = { ...map[key], quantidade: map[key].quantidade + m.quantidade, _merged: true };
      } else {
        map[key] = { ...m };
      }
    });
    return Object.values(map);
  })() : filtered;

  // Group by top-level path element
  const grouped = displayList.reduce((acc,m)=>{
    const key = (m.path&&m.path[0]) || "Sem categoria";
    (acc[key]=acc[key]||[]).push(m);
    return acc;
  },{});

  const getColor = key => AREA_COLORS[Object.keys(grouped).indexOf(key) % AREA_COLORS.length];

  const exportCSV = () => {
    const h = "Código,Caminho,Nome,Quantidade\n";
    const r = materiais.map(m=>`${m.codigoArtigo||""},"${(m.path||[]).join(" › ")}","${m.nome}",${m.quantidade}`).join("\n");
    const b = new Blob(["\uFEFF"+h+r],{type:"text/csv;charset=utf-8"});
    const u = URL.createObjectURL(b);
    const a = document.createElement("a"); a.href=u; a.download=`${projeto||"materiais"}.csv`; a.click(); URL.revokeObjectURL(u);
    notify("CSV exportado!");
  };

  const handlePrint = () => {
    const date = new Date().toLocaleDateString("pt-PT",{day:"2-digit",month:"long",year:"numeric"});
    const rows = items => items.map((m,i)=>`<tr style="background:${i%2===0?"#fff":"#fff8f8"}"><td style="font-family:monospace;font-weight:700;color:#c0392b">${m.codigoArtigo||"—"}</td><td>${m.nome}</td><td>${(m.path||[]).join(" › ")}</td><td style="text-align:right;font-weight:700">${m.quantidade.toLocaleString("pt-PT")}</td></tr>`).join("");
    const secs = Object.entries(grouped).map(([key,items])=>`<div style="margin-bottom:28px"><div style="padding-bottom:6px;margin-bottom:10px;border-bottom:2px solid #e8000d"><span style="font-size:12px;letter-spacing:2px;color:#e8000d;font-weight:700;text-transform:uppercase">${key}</span> <span style="font-size:11px;color:#999">(${items.length} itens)</span></div><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="background:#fff0f0"><th style="padding:7px 10px;text-align:left;font-size:10px;color:#e8000d;width:90px">CÓD.</th><th style="padding:7px 10px;text-align:left">NOME</th><th style="padding:7px 10px;text-align:left">CAMINHO</th><th style="padding:7px 10px;text-align:right">QTD.</th></tr></thead><tbody>${rows(items)}</tbody></table></div>`).join("");
    const notasHtml = notas.length>0 ? `<div style="margin-top:32px;padding-top:18px;border-top:2px solid #e8000d"><div style="font-size:11px;letter-spacing:2px;color:#e8000d;margin-bottom:12px;font-weight:700">NOTAS</div>${notas.map(n=>`<div style="margin-bottom:10px;padding:10px 14px;background:#fff8f8;border-left:3px solid #e8000d;border-radius:4px">${n.titulo?`<div style="font-size:12px;font-weight:700;margin-bottom:3px">${n.titulo}</div>`:""}<div style="font-size:12px;color:#444;white-space:pre-wrap">${n.texto}</div><div style="font-size:10px;color:#bbb;margin-top:5px">${n.data}</div></div>`).join("")}</div>` : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${projeto}</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:monospace;color:#1a1a1a;background:#fff;padding:36px;font-size:12px}td{padding:7px 10px;border-bottom:1px solid #ffe0e0;vertical-align:top}@media print{body{padding:18px}}</style></head><body><div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:18px;border-bottom:3px solid #e8000d"><div><div style="font-size:22px;font-weight:800;color:#e8000d"><img src="/logo.jpg" style="height:48px;object-fit:contain"></div><div style="font-size:17px;font-weight:700;margin-top:5px">${projeto}</div></div><div style="text-align:right;font-size:11px;color:#999;line-height:1.8"><div>${date}</div><div>Total: <strong style="color:#e8000d">${materiais.length}</strong> itens</div></div></div>${secs}${notasHtml}<div style="position:fixed;top:16px;right:16px;display:flex;gap:8px;z-index:999" class="no-print"><button onclick="window.print()" style="background:#e8000d;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:14px;cursor:pointer;font-weight:700">🖨 Imprimir</button><button onclick="window.close()" style="background:#fff;color:#333;border:1px solid #ccc;border-radius:8px;padding:10px 18px;font-size:14px;cursor:pointer">✕ Fechar</button></div><script>window.onload=()=>window.print()<\/script><style>.no-print{display:flex}@media print{.no-print{display:none!important}}<\/style></body></html>`;
    const w = window.open("","_blank"); w.document.write(html); w.document.close();
  };

  const btnP = {background:C.red,color:"#fff",border:"none",borderRadius:7,padding:"10px 18px",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13};
  const btnG = {background:C.bg,border:`1px solid ${C.border}`,color:C.textMid,borderRadius:7,padding:"9px 14px",cursor:"pointer",fontSize:12};

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Mono',monospace",color:C.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        input,select,button,textarea{font-family:inherit}
        select option{background:${C.bg};color:${C.text}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bgAlt}}::-webkit-scrollbar-thumb{background:${C.borderLight};border-radius:3px}
        .fade{animation:fi .2s ease}@keyframes fi{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .rh:hover{background:${C.redLight} !important;transition:background .1s}
        .bh:hover{opacity:.6}
        .notif{animation:sn .2s ease}@keyframes sn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
        label{display:block;font-size:9px;letter-spacing:2px;color:${C.textFaint};margin-bottom:5px}
        .tab-btn{background:none;border:none;cursor:pointer;padding:9px 16px;font-size:12px;border-bottom:2px solid transparent;transition:all .15s;letter-spacing:.5px;color:${C.textFaint};white-space:nowrap}
        .tab-btn.active{color:${C.red};border-bottom-color:${C.red};font-weight:600}
        .hdr-btn{background:${C.bg};border:1px solid ${C.border};color:${C.text};border-radius:7px;padding:7px 12px;cursor:pointer;font-size:11px;display:flex;align-items:center;gap:5px;transition:all .15s;white-space:nowrap}
        .hdr-btn:hover{background:${C.redLight};color:${C.red}}
        .suggest-row:hover>div:first-child{background:${C.redLight}}
        .suggest-row:hover>div:last-child{background:${C.borderLight}}
        input:focus,select:focus,textarea:focus{border-color:${C.border} !important;outline:none}
        .card{background:${C.bgAlt};border:1px solid ${C.border};border-radius:10px;padding:16px;margin-bottom:12px}
        .step-lbl{font-size:9px;letter-spacing:2px;color:${C.red};font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:7px}
        .step-num{width:20px;height:20px;border-radius:50%;background:${C.red};color:#fff;font-size:10px;display:inline-flex;align-items:center;justify-content:center;font-weight:700;flex-shrink:0}
        .lock-pill{font-size:10px;background:${C.redLight};border:1px solid ${C.borderLight};color:${C.red};border-radius:99px;padding:2px 10px;cursor:pointer;margin-left:auto;white-space:nowrap}
        .lock-pill:hover{background:${C.borderLight}}
        .list-grid{display:grid;grid-template-columns:40px 90px 1.4fr 1fr 60px 80px;gap:0}
        @media(max-width:700px){
          .list-grid{grid-template-columns:36px 70px 1fr 60px 44px}
          .list-path{display:none}
          .hdr-btn span.btn-label{display:none}
        }
      `}</style>

      {/* Modals */}
      {modal==="theme"&&<div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.4)",display:"flex",alignItems:"center",justifyContent:"center",padding:12}}><div style={{background:C.bg,border:`2px solid ${C.border}`,borderRadius:12,width:"100%",maxWidth:460,maxHeight:"92vh",display:"flex",flexDirection:"column",overflow:"hidden"}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 20px",borderBottom:`1px solid ${C.border}`,flexShrink:0,background:C.redLight}}><div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:15,color:C.red}}>🎨 Personalizar Tema</div><button onClick={()=>setModal(null)} style={{background:"none",border:"none",color:C.textFaint,cursor:"pointer",fontSize:20}}>✕</button></div><ThemePanel accent={accent} setAccent={setAccent} themeBg={themeBg} setThemeBg={setThemeBg} notify={notify}/></div></div>}
      {modal==="admin_tax"&&<AdminModal onSuccess={()=>setModal("admin_panel")} onClose={()=>setModal(null)}/>}
      {modal==="admin_panel"&&<AdminPanel taxonomy={taxonomy} db={db} dbLoading={dbLoading} onClose={()=>setModal(null)} onAdd={dbAdd} onUpdate={dbUpdate} onDelete={dbDelete} onImport={dbImport} notify={notify}/>}
      {modal==="database_view"&&<DatabaseViewModal db={db} dbLoading={dbLoading} taxonomy={taxonomy} onClose={()=>setModal(null)} onQuickAdd={onQuickAdd}/>}

      {/* Quick-add popup */}
      {quickItem&&(
        <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.25)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:C.bg,border:`2px solid ${C.border}`,borderRadius:12,padding:"24px 28px",maxWidth:340,width:"100%",boxShadow:"0 8px 32px rgba(232,0,13,.12)"}}>
            <div style={{fontSize:10,letterSpacing:2,color:C.red,marginBottom:8}}>{quickItem._editing?"EDITAR QUANTIDADE":"ADICIONAR À LISTAGEM"}</div>
            <div style={{fontWeight:700,fontSize:15,color:C.text,marginBottom:4}}>{quickItem.nome}</div>
            <div style={{fontSize:11,color:C.textFaint,marginBottom:16}}>{quickItem.codigo||quickItem.codigoArtigo||""}</div>
            <label>QUANTIDADE</label>
            <input ref={qtdQuickRef} value={qtdQuick} onChange={e=>setQtdQuick(e.target.value)} type="number" min="1" placeholder="0"
              onKeyDown={e=>{if(e.key==="Enter")confirmQuickAdd();if(e.key==="Escape"){setQuickItem(null);setQtdQuick("");}}}
              style={{...S.inp(!!qtdQuick),marginBottom:16,fontSize:20,padding:"12px 14px"}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={confirmQuickAdd} disabled={!qtdQuick||Number(qtdQuick)<=0} style={{...btnP,flex:1,opacity:qtdQuick&&Number(qtdQuick)>0?1:0.35}}>{quickItem._editing?"Guardar":"Adicionar"}</button>
              <button onClick={()=>{setQuickItem(null);setQtdQuick("");}} style={btnG}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {notification&&<div className="notif" style={{position:"fixed",top:16,right:16,zIndex:9999,background:notification.type==="err"?C.redLight:C.bg,color:notification.type==="err"?C.red:"#1a7a38",border:`1px solid ${notification.type==="err"?C.border:"#a0d8b0"}`,borderRadius:8,padding:"10px 16px",fontSize:12,boxShadow:"0 4px 12px rgba(0,0,0,.1)"}}>{notification.msg}</div>}

      {/* Header */}
      <div style={{background:C.bg,borderBottom:`2px solid ${C.border}`,padding:"12px 16px",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
        <img src="/logo.jpg" alt="Logo" style={{height:38,maxWidth:160,objectFit:"contain",marginRight:4}}/>
        <div style={{flex:1,minWidth:0}}/>
        {!eP&&<div style={{display:"flex",alignItems:"center",gap:6,marginRight:4,minWidth:0,overflow:"hidden"}}>
          <span style={{fontSize:10,color:C.textFaint,letterSpacing:2,flexShrink:0}}>PROJETO</span>
          <span style={{fontSize:12,color:C.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:140}}>{projeto}</span>
          <button onClick={()=>{setEP(true);setPI(projeto);}} className="bh" style={{background:"none",border:"none",color:C.textFaint,cursor:"pointer",fontSize:12,flexShrink:0}}>✎</button>
        </div>}
        <button onClick={()=>setModal("database_view")} className="hdr-btn" style={{padding:"9px 14px",fontSize:13,height:38}}>◈ <span className="btn-label">Base de Dados</span>{db.length>0&&<span style={{background:C.redLight,color:C.red,borderRadius:99,padding:"1px 7px",fontSize:10,border:`1px solid ${C.borderLight}`}}>{db.length}</span>}</button>
        <button onClick={()=>setModal("theme")} className="hdr-btn" style={{padding:"9px 14px",fontSize:13,height:38}}>🎨 <span className="btn-label">Tema</span></button>
        <button onClick={()=>setModal("admin_tax")} className="hdr-btn" style={{padding:"9px 14px",fontSize:13,height:38}}>⚙ <span className="btn-label">Configurações</span></button>
      </div>

      {/* Tabs */}
      {!eP&&<div style={{background:C.bg,borderBottom:`1px solid ${C.border}`,padding:"0 16px",display:"flex",overflowX:"auto"}}>
        <button className={`tab-btn${activeTab==="materiais"?" active":""}`} onClick={()=>setActiveTab("materiais")}>Materiais</button>
        <button className={`tab-btn${activeTab==="notas"?" active":""}`} onClick={()=>setActiveTab("notas")}>Notas{notas.length>0&&<span style={{background:C.redLight,color:C.red,borderRadius:99,padding:"1px 6px",fontSize:10,marginLeft:4,border:`1px solid ${C.borderLight}`}}>{notas.length}</span>}</button>
      </div>}

      <div style={{maxWidth:1040,margin:"0 auto",padding:"20px 16px"}}>

        {/* Project setup */}
        {eP&&<div className="fade" style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:"24px 20px",marginBottom:24}}>
          <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:18,marginBottom:4}}>Processo</div>
          <div style={{fontSize:12,color:C.textFaint,marginBottom:16}}>Identifique o processo antes de começar.</div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <input autoFocus value={pI} onChange={e=>setPI(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&pI.trim()){setProjeto(pI.trim());setEP(false);notify("Projeto definido!");}}} placeholder="Ex: P800 - Ferramenta de blocos..." style={{...S.inp(!!pI),flex:"1 1 200px"}}/>
            <button onClick={()=>{if(pI.trim()){setProjeto(pI.trim());setEP(false);notify("Projeto definido!");}}} style={btnP}>Confirmar →</button>
          </div>
        </div>}

        {/* MATERIAIS TAB */}
        {!eP&&activeTab==="materiais"&&<div className="fade">

          {/* Global search */}
          {db.length>0&&<div className="card">
            <div className="step-lbl"><span className="step-num">?</span>PESQUISA RÁPIDA</div>
            <ArticleSearch db={db} taxonomy={taxonomy} value={articleSearch} onChange={v=>setArticleSearch(v)} onSelect={onSelectArticle} onQuickAdd={onQuickAdd} getArticleImage={getArticleImage}/>
            <div style={{fontSize:10,color:C.textFaint,marginTop:6}}>Seleciona para pré-preencher os campos, ou "+ Adicionar" para definir só a quantidade.</div>
          </div>}

          {/* Step 1 — tree selector */}
          <div className="card">
            <div className="step-lbl">
              <span className="step-num">1</span>SELECIONAR CATEGORIA
            </div>
            {selPath.length>0&&selPath[0]&&(
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,padding:"6px 10px",background:C.redLight,border:`1px solid ${C.borderLight}`,borderRadius:6}}>
                <span style={{fontSize:11,color:C.red,fontWeight:600,flex:1}}>{nodes.find(n=>n.id===selPath[0])?.name||""}</span>
                <button className="lock-pill" onClick={()=>{setSelPath([]);setSelId("");setQtdDrop("");}}>✕ mudar família</button>
              </div>
            )}
            <TreeSelector taxonomy={taxonomy} value={selPath} onChange={path=>{setSelPath(path);setSelId("");setQtdDrop("");}}/>

            {/* Show articles of selected leaf directly in Step 1 */}
            {currentLeafId && dbInLeaf.length>0 && (
              <div style={{marginTop:14,borderTop:`1px dashed ${C.borderLight}`,paddingTop:12}}>
                <div style={{fontSize:9,letterSpacing:2,color:C.textFaint,marginBottom:8}}>ARTIGOS DISPONÍVEIS ({dbInLeaf.length})</div>
                <div style={{display:"flex",flexDirection:"column",gap:4}}>
                  {[...dbInLeaf].sort((a,b)=>a.nome.localeCompare(b.nome,"pt")).map(item=>{
                    const img = getArticleImage(item);
                    return (
                      <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 8px",borderRadius:6,background:String(selId)===String(item.id)?C.redLight:C.bgAlt,border:`1px solid ${String(selId)===String(item.id)?C.border:C.borderFaint}`,cursor:"pointer"}}
                        onClick={()=>{setSelId(String(item.id));setTimeout(()=>qtdDropRef.current?.focus(),60);}}>
                        <div style={{width:32,height:32,borderRadius:4,overflow:"hidden",background:"#fff",border:`1px solid ${C.borderLight}`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                          {img?<img src={img} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:14}}>📦</span>}
                        </div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:String(selId)===String(item.id)?700:400}}>{item.nome}</div>
                          {item.descricao&&<div style={{fontSize:10,color:C.textFaint}}>{item.descricao}</div>}
                        </div>
                        <span style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:"monospace",flexShrink:0}}>{item.codigo}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {currentLeafId && dbInLeaf.length===0 && (
              <div style={{marginTop:14,borderTop:`1px dashed ${C.borderLight}`,paddingTop:10,fontSize:11,color:C.textFaint,textAlign:"center"}}>
                Sem artigos nesta categoria — usa a entrada manual abaixo.
              </div>
            )}
          </div>

          {/* Step 2 — qty + manual */}
          {selPath.length>0&&<div className="card" style={{borderColor:C.red,background:C.bg}}>
            <div className="step-lbl"><span className="step-num">2</span>QUANTIDADE</div>

            {selId&&dbInLeaf.length>0&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 120px 52px",gap:10,marginBottom:16,alignItems:"flex-end"}}>
                <div style={{fontSize:12,color:C.text,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",alignSelf:"center"}}>
                  {db.find(i=>String(i.id)===String(selId))?.nome||""}
                </div>
                <div>
                  <label>QUANTIDADE</label>
                  <input ref={qtdDropRef} value={qtdDrop} onChange={e=>setQtdDrop(e.target.value)} type="number" min="1" placeholder="0" onKeyDown={e=>e.key==="Enter"&&addFromDropdown()} style={S.inp(!!qtdDrop)}/>
                </div>
                <button onClick={addFromDropdown} disabled={!selId||!qtdDrop||Number(qtdDrop)<=0} style={{...btnP,opacity:selId&&qtdDrop&&Number(qtdDrop)>0?1:0.35,padding:"10px 12px"}}>+</button>
              </div>
            )}

            <div style={{paddingTop:dbInLeaf.length>0?12:0,borderTop:dbInLeaf.length>0?`1px dashed ${C.borderLight}`:"none"}}>
              {dbInLeaf.length>0&&<div style={{fontSize:9,letterSpacing:2,color:C.textFaint,marginBottom:10}}>OU ENTRADA MANUAL</div>}
              <div style={{display:"grid",gridTemplateColumns:"100px 1fr 120px 52px",gap:10,alignItems:"flex-end"}}>
                <div><label>CÓD.</label><input value={mCod} onChange={e=>setMCod(e.target.value)} placeholder="ART..." style={S.inp(!!mCod)}/></div>
                <div><label>NOME / DESCRIÇÃO *</label><input value={manNome} onChange={e=>setManNome(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addManual()} placeholder="Nome do artigo..." style={S.inp(!!manNome)}/></div>
                <div><label>QTD. *</label><input value={mQtd} onChange={e=>setMQtd(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addManual()} type="number" min="1" placeholder="0" style={S.inp(!!mQtd)}/></div>
                <button onClick={addManual} disabled={!manNome.trim()||!mQtd||Number(mQtd)<=0} style={{...btnP,background:dbInLeaf.length>0?"#555":C.red,opacity:manNome.trim()&&mQtd&&Number(mQtd)>0?1:0.35,padding:"10px 8px"}}>+</button>
              </div>
            </div>
          </div>}

          {/* Toolbar */}
          <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
            <div style={{position:"relative",flex:"1 1 140px",minWidth:0}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textFaint,fontSize:12}}>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Pesquisar..." style={{...S.inp(false),paddingLeft:28}}/></div>
            <span style={{fontSize:11,color:C.textFaint,whiteSpace:"nowrap"}}>{filtered.length} itens{groupSame&&displayList.length<filtered.length?` → ${displayList.length} agrupados`:""}</span>
            <button onClick={()=>setGroupSame(v=>!v)} style={{background:groupSame?C.red:C.bg,color:groupSame?"#fff":C.textMid,border:`1px solid ${groupSame?C.red:C.border}`,borderRadius:7,padding:"9px 14px",cursor:"pointer",fontSize:13,whiteSpace:"nowrap",transition:"all .15s",height:38}}>
              Σ {groupSame?"Agrupado":"Agrupar iguais"}
            </button>
            {materiais.length>0&&<>
              <button onClick={exportCSV} className="bh hdr-btn" style={{padding:"9px 14px",fontSize:13,height:38}}>↓ CSV</button>
              <button onClick={handlePrint} className="bh hdr-btn" style={{padding:"9px 14px",fontSize:13,height:38}}>⎙ Imprimir</button>
              <button onClick={()=>setConfirmClear(true)} className="bh hdr-btn" style={{color:C.red,borderColor:C.red,padding:"9px 14px",fontSize:13,height:38}}>🗑 Nova lista</button>
            </>}
          </div>

          {/* Confirm clear modal */}
          {confirmClear&&(
            <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,.35)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
              <div style={{background:C.bg,border:`2px solid ${C.red}`,borderRadius:12,padding:"28px",maxWidth:340,width:"100%"}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,marginBottom:8}}>🗑 Nova lista</div>
                <div style={{fontSize:13,color:C.textMid,marginBottom:20,lineHeight:1.6}}>Tens a certeza que queres apagar toda a lista de materiais e começar de novo?<br/><strong style={{color:C.red}}>Esta ação não pode ser desfeita.</strong></div>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>{setMateriais([]);setConfirmClear(false);setProjeto("");setPI("");setEP(true);notify("Lista apagada!");}} style={{flex:1,background:C.red,color:"#fff",border:"none",borderRadius:7,padding:"11px",cursor:"pointer",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:13}}>Apagar tudo</button>
                  <button onClick={()=>setConfirmClear(false)} style={{background:C.bg,border:`1px solid ${C.border}`,color:C.textMid,borderRadius:7,padding:"11px 16px",cursor:"pointer",fontSize:12}}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Empty */}
          {filtered.length===0&&<div style={{border:`1px dashed ${C.border}`,borderRadius:10,padding:"44px 20px",textAlign:"center",color:C.textFaint}}>
            <div style={{fontSize:26,marginBottom:8,color:C.borderLight}}>◻</div>
            <div style={{fontSize:12}}>{materiais.length===0?"Nenhum material adicionado ainda.":"Nenhum resultado encontrado."}</div>
          </div>}

          {/* Grouped list */}
          {Object.keys(grouped).map(key=>(
            <div key={key} style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:6}}>
                <span style={{width:8,height:8,borderRadius:"50%",background:getColor(key),display:"inline-block",flexShrink:0}}/>
                <span style={{fontSize:10,letterSpacing:2,color:C.red,fontWeight:600}}>{key.toUpperCase()}</span>
                <span style={{fontSize:10,color:C.textFaint}}>({grouped[key].length})</span>
              </div>
              <div style={{border:`1px solid ${C.border}`,borderRadius:8,overflow:"hidden"}}>
                <div className="list-grid" style={{padding:"7px 12px",borderBottom:`1px solid ${C.border}`,fontSize:9,letterSpacing:2,color:C.textFaint,background:C.bgAlt}}>
                  <span></span><span>CÓD.</span><span>NOME</span><span className="list-path">CAMINHO</span><span style={{textAlign:"right"}}>QTD.</span><span></span>
                </div>
                {grouped[key].map((m,i)=>{
                  const dbItem = db.find(d=>d.id===m.dbItemId||String(d.id)===String(m.dbItemId));
                  const itemImg = getArticleImage(dbItem);
                  return (
                  <div key={m.id} className="rh list-grid" style={{padding:"7px 12px",borderBottom:i<grouped[key].length-1?`1px solid ${C.borderFaint}`:"none",alignItems:"center",background:C.bg}}>
                    <div style={{width:32,height:32,borderRadius:4,overflow:"hidden",background:C.bgAlt,border:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {itemImg ? <img src={itemImg} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <span style={{fontSize:14}}>📦</span>}
                    </div>
                    <span style={{fontSize:11,fontWeight:700,color:m.codigoArtigo?C.red:C.textFaint,fontFamily:"monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.codigoArtigo||"—"}</span>
                    <span style={{fontSize:12,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.nome}</span>
                    <span className="list-path" style={{fontSize:11,color:C.textFaint,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(m.path||[]).slice(1).join(" › ")}</span>
                    <span style={{textAlign:"center",fontSize:14,fontWeight:700,color:C.red,display:"block"}}>{m.quantidade.toLocaleString("pt-PT")}</span>
                    <div style={{display:"flex",justifyContent:"flex-end",gap:2}}>
                      {!m._merged&&<button onClick={()=>handleEdit(m)} className="bh" style={{background:"none",border:"none",cursor:"pointer",color:C.textFaint,fontSize:16,padding:"6px 8px",minWidth:32,minHeight:32}}>✎</button>}
                      {!m._merged&&<button onClick={()=>handleDelete(m.id)} className="bh" style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:16,padding:"6px 8px",minWidth:32,minHeight:32}}>✕</button>}
                    </div>
                  </div>
                );})}
              </div>
            </div>
          ))}

          {/* Summary */}
          {materiais.length>0&&<div style={{padding:"12px 16px",background:C.bgAlt,border:`1px solid ${C.border}`,borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10,marginTop:4}}>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {Object.keys(grouped).map(k=><div key={k} style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:getColor(k),display:"inline-block",flexShrink:0}}/><span style={{fontSize:11,color:C.textMid}}>{k}</span><span style={{fontSize:11,color:C.red,fontWeight:600}}>{grouped[k].length}</span>
              </div>)}
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <button onClick={handlePrint} className="bh hdr-btn" style={{padding:"9px 14px",fontSize:13}}>⎙ Imprimir relatório</button>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",background:C.red,borderRadius:8,padding:"6px 16px",minWidth:60}}><span style={{fontSize:9,letterSpacing:2,color:"rgba(255,255,255,0.7)",fontWeight:600}}>TOTAL</span><span style={{fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:24,color:"#fff",lineHeight:1}}>{materiais.length}</span></div>
            </div>
          </div>}
        </div>}

        {/* NOTAS TAB */}
        {!eP&&activeTab==="notas"&&<div className="fade">
          <div style={{background:C.bgAlt,border:`1px solid ${eNId!==null?C.red:C.border}`,borderRadius:10,padding:"18px 16px",marginBottom:16}}>
            <div style={{fontSize:9,letterSpacing:2,color:C.red,marginBottom:12}}>{eNId!==null?"✎  EDITAR NOTA":"+  NOVA NOTA"}</div>
            <div style={{marginBottom:10}}><label>TÍTULO (opcional)</label><input value={notaForm.titulo} onChange={e=>setNotaForm(f=>({...f,titulo:e.target.value}))} placeholder="Ex: Reunião com fornecedor..." style={S.inp(!!notaForm.titulo)}/></div>
            <div style={{marginBottom:12}}><label>NOTA</label><textarea value={notaForm.texto} onChange={e=>setNotaForm(f=>({...f,texto:e.target.value}))} placeholder="Escreve aqui as tuas notas..." rows={4} style={{background:C.bg,border:`1px solid ${notaForm.texto?C.border:C.borderLight}`,borderRadius:6,color:C.text,padding:"9px 11px",fontSize:13,outline:"none",width:"100%",resize:"vertical",lineHeight:1.6}}/></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button onClick={saveNota} disabled={!notaForm.texto.trim()} style={{...btnP,opacity:notaForm.texto.trim()?1:0.35}}>{eNId!==null?"Guardar":"Adicionar nota"}</button>
              {eNId!==null&&<button onClick={()=>{setENId(null);setNotaForm({titulo:"",texto:""});}} style={btnG}>Cancelar</button>}
            </div>
          </div>
          {notas.length===0
            ? <div style={{border:`1px dashed ${C.border}`,borderRadius:10,padding:"44px 20px",textAlign:"center",color:C.textFaint}}><div style={{fontSize:26,marginBottom:8,color:C.borderLight}}>✎</div><div style={{fontSize:12}}>Nenhuma nota adicionada.</div></div>
            : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {notas.map(n=><div key={n.id} className="rh" style={{background:C.bg,border:`1px solid ${C.border}`,borderLeft:`3px solid ${C.red}`,borderRadius:8,padding:"14px 16px"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                    <div style={{flex:1,minWidth:0}}>
                      {n.titulo&&<div style={{fontSize:13,fontWeight:600,color:C.text,marginBottom:5}}>{n.titulo}</div>}
                      <div style={{fontSize:13,color:C.textMid,lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{n.texto}</div>
                      <div style={{fontSize:10,color:C.textFaint,marginTop:7,letterSpacing:1}}>{n.data}</div>
                    </div>
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      <button onClick={()=>editNota(n)} className="bh" style={{background:"none",border:"none",cursor:"pointer",color:C.textFaint,fontSize:13,padding:"3px 5px"}}>✎</button>
                      <button onClick={()=>deleteNota(n.id)} className="bh" style={{background:"none",border:"none",cursor:"pointer",color:C.red,fontSize:13,padding:"3px 5px"}}>✕</button>
                    </div>
                  </div>
                </div>)}
              </div>
          }
        </div>}
      </div>
    </div>
  );
}
