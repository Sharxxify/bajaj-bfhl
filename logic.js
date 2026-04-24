function processData(data) {
    const invalid_entries = [];
    const duplicate_edges = [];
    const valid_edges = [];
    const seen_edges = new Set();
    const duplicate_added = new Set();

    if (!Array.isArray(data)) {
        return { error: "data must be an array" };
    }

    // Step 1: Validate & detect duplicates
    // Per PDF: whitespace-padded strings like " A->B " are INVALID — do NOT trim before validation
    for (let item of data) {
        if (typeof item !== 'string') {
            invalid_entries.push(String(item));
            continue;
        }
        if (item.trim() === '') {
            invalid_entries.push(item);
            continue;
        }
        // No trimming — " A->B " must be rejected
        if (!/^[A-Z]->[A-Z]$/.test(item)) {
            invalid_entries.push(item);
            continue;
        }
        const u = item[0], v = item[3];
        if (u === v) {
            invalid_entries.push(item);
            continue;
        }
        if (seen_edges.has(item)) {
            if (!duplicate_added.has(item)) {
                duplicate_edges.push(item);
                duplicate_added.add(item);
            }
        } else {
            seen_edges.add(item);
            valid_edges.push(item);
        }
    }

    // Step 2: Apply diamond rule FIRST to build the filtered adjacency list
    // Per PDF spec: "first parent edge wins; discard later parents for same child"
    // This must happen BEFORE cycle detection so O->N is discarded before we check for cycles.
    const parentMap = {};
    const adj = {};
    const nodes = new Set();

    for (let edge of valid_edges) {
        const u = edge[0], v = edge[3];
        nodes.add(u);
        nodes.add(v);
        if (parentMap[v] !== undefined) continue; // diamond rule: first parent wins
        parentMap[v] = u;
        if (!adj[u]) adj[u] = [];
        adj[u].push(v);
    }

    // Step 3: Find Weakly Connected Components on the DIAMOND-RULE-FILTERED graph
    const undirectedAdj = {};
    for (let node of nodes) undirectedAdj[node] = [];
    for (let node of nodes) {
        if (adj[node]) {
            for (let child of adj[node]) {
                undirectedAdj[node].push(child);
                undirectedAdj[child].push(node);
            }
        }
    }
    // Deduplicate undirected adjacency
    for (let node of nodes) undirectedAdj[node] = [...new Set(undirectedAdj[node])];

    const visitedNodes = new Set();
    const components = [];
    for (let node of [...nodes].sort()) {
        if (!visitedNodes.has(node)) {
            const comp = new Set();
            const q = [node];
            visitedNodes.add(node);
            while (q.length > 0) {
                const curr = q.shift();
                comp.add(curr);
                for (let nb of undirectedAdj[curr]) {
                    if (!visitedNodes.has(nb)) {
                        visitedNodes.add(nb);
                        q.push(nb);
                    }
                }
            }
            components.push(comp);
        }
    }

    // Step 4: For each WCC, find roots, detect cycles, build output
    let total_trees = 0;
    let total_cycles = 0;
    let max_depth = 0;
    let largest_tree_root = null;
    const hierarchies = [];

    for (let comp of components) {
        // Roots = nodes in this component with no parent in the diamond-rule-filtered graph
        const compRoots = [...comp].filter(n => parentMap[n] === undefined).sort();

        if (compRoots.length === 0) {
            // Pure cycle: every node has a parent → no root exists
            // Use lex-smallest node as the representative root
            const root = [...comp].sort()[0];
            total_cycles++;
            hierarchies.push({ root, tree: {}, has_cycle: true });
        } else {
            // One or more trees rooted here. Run DFS per root to detect cycles and build tree.
            for (let root of compRoots) {
                const visited = new Set();
                const recStack = new Set();
                let cycleFound = false;

                function dfs(node) {
                    visited.add(node);
                    recStack.add(node);
                    let maxChildDepth = 0;
                    const treeObj = {};
                    if (adj[node]) {
                        for (let child of adj[node]) {
                            if (recStack.has(child)) {
                                // Back-edge in the diamond-rule-filtered graph = real cycle
                                cycleFound = true;
                            } else if (!visited.has(child)) {
                                const { depth: cd, tree: ct } = dfs(child);
                                maxChildDepth = Math.max(maxChildDepth, cd);
                                treeObj[child] = ct;
                            }
                        }
                    }
                    recStack.delete(node);
                    return { depth: maxChildDepth + 1, tree: treeObj };
                }

                const { depth, tree } = dfs(root);

                if (cycleFound) {
                    total_cycles++;
                    hierarchies.push({ root, tree: {}, has_cycle: true });
                } else {
                    total_trees++;
                    hierarchies.push({ root, tree: { [root]: tree }, depth });
                    if (depth > max_depth || (depth === max_depth && (!largest_tree_root || root < largest_tree_root))) {
                        max_depth = depth;
                        largest_tree_root = root;
                    }
                }
            }
        }
    }

    hierarchies.sort((a, b) => a.root.localeCompare(b.root));

    return {
        user_id: "sreehaas_penugonda_30112005",
        email_id: "sp0468@srmist.edu.in",
        college_roll_number: "RA2311032010028",
        hierarchies,
        invalid_entries,
        duplicate_edges,
        summary: {
            total_trees,
            total_cycles,
            largest_tree_root
        }
    };
}

module.exports = { processData };