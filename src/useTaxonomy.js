/* eslint-disable no-unused-vars, no-loop-func */
// src/useTaxonomy.js
// Each node has: { id, name, label, parentId, order }
// "label" is what appears as the selector heading for that node's children
import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, writeBatch, query, orderBy
} from "firebase/firestore";

const COL = "taxonomy";

export function useTaxonomy() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, COL), orderBy("order","asc")),
      snap => { setNodes(snap.docs.map(d=>({id:d.id,...d.data()}))); setLoading(false); },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const getChildren = (parentId = null) =>
    nodes.filter(n => (n.parentId ?? null) === (parentId ?? null));

  const getPath = (nodeId) => {
    const path = [];
    let cur = nodes.find(n => n.id === nodeId);
    while (cur) { path.unshift(cur.name); cur = cur.parentId ? nodes.find(n => n.id === cur.parentId) : null; }
    return path;
  };

  const getLeaves = () => nodes.filter(n => !nodes.some(c => c.parentId === n.id));

  // Walk up the tree from a nodeId to find the nearest image
  const getNodeImage = (nodeId) => {
    let cur = nodes.find(n => n.id === nodeId);
    while (cur) {
      if (cur.imageUrl) return cur.imageUrl;
      cur = cur.parentId ? nodes.find(n => n.id === cur.parentId) : null;
    }
    return null;
  };

  // Save image to a node
  const saveNodeImage = async (id, imageUrl) => {
    await updateNode(id, undefined, undefined, imageUrl);
  };

  // Get the label to show ABOVE a level's selector
  // = the "label" field of the parent node (which describes what its children are)
  const getLevelLabel = (parentId) => {
    if (!parentId) return "FAMÍLIA";
    const parent = nodes.find(n => n.id === parentId);
    return parent?.label ? parent.label.toUpperCase() : "SUBCATEGORIA";
  };

  // Add root node
  const addRoot = async (name, label) => {
    const order = getChildren(null).length;
    await addDoc(collection(db, COL), {
      name: name.trim(),
      label: label ? label.trim() : "", // label describes what THIS node's children are
      parentId: null,
      order,
    });
  };

  // Add child node
  const addNode = async (name, parentId, label = "") => {
    const siblings = getChildren(parentId);
    await addDoc(collection(db, COL), {
      name: name.trim(),
      label: label ? label.trim() : "",
      parentId,
      order: siblings.length,
    });
  };

  // Update node name and/or label and/or imageUrl
  const updateNode = async (id, name, label, imageUrl) => {
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (label !== undefined) data.label = label.trim();
    if (imageUrl !== undefined) data.imageUrl = imageUrl;
    await updateDoc(doc(db, COL, id), data);
  };

  const deleteNode = async (id) => {
    const toDelete = getAllDescendants(id, nodes);
    toDelete.push(id);
    const batch = writeBatch(db);
    toDelete.forEach(did => batch.delete(doc(db, COL, did)));
    await batch.commit();
  };

  // Reorder children of a parent: newOrder = array of nodeIds in desired order
  const reorderNodes = async (orderedIds) => {
    const batch = writeBatch(db);
    orderedIds.forEach((id, index) => {
      batch.update(doc(db, COL, id), { order: index });
    });
    await batch.commit();
  };

  return { nodes, loading, getChildren, getPath, getLeaves, getLevelLabel, getNodeImage, saveNodeImage, addRoot, addNode, updateNode, deleteNode, reorderNodes };
}

function getAllDescendants(id, nodes) {
  const children = nodes.filter(n => n.parentId === id).map(n => n.id);
  return children.reduce((acc, cid) => [...acc, ...getAllDescendants(cid, nodes)], children);
}
