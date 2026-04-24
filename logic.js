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
        // Empty or whitespace-only strings are invalid
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

    // Step 2: Build full adjacency and undirected graph to find WCCs (Weakly Connected Components)
    const nodes = new Set();
    const fullAdj = {};
    const inDegree = {};
    const undirectedAdj = {};

    for (let edge of valid_edges) {
        const u = edge[0], v = edge[3];
        nodes.add(u);
        nodes.add(v);
        
        if (!fullAdj[u]) fullAdj[u] = [];
        fullAdj[u].push(v);
        
        inDegree[v] = (inDegree[v] || 0) + 1;
        if (inDegree[u] === undefined) inDegree[u] = 0;

        if (!undirectedAdj[u]) undirectedAdj[u] = [];
        if (!undirectedAdj[v]) undirectedAdj[v] = [];
        undirectedAdj[u].push(v);
        undirectedAdj[v].push(u);
    }

    // Ensure isolated nodes have inDegree 0
    for (let node of nodes) {
        if (inDegree[node] === undefined) inDegree[node] = 0;
    }

    // Find WCCs
    const visitedNodes = new Set();
    const components = [];

    for (let node of nodes) {
        if (!visitedNodes.has(node)) {
            const comp = new Set();
            const q = [node];
            visitedNodes.add(node);
            
            while (q.length > 0) {
                const curr = q.shift();
                comp.add(curr);
                if (undirectedAdj[curr]) {
                    for (let neighbor of undirectedAdj[curr]) {
                        if (!visitedNodes.has(neighbor)) {
                            visitedNodes.add(neighbor);
                            q.push(neighbor);
                        }
                    }
                }
            }
            components.push(comp);
        }
    }

    let total_trees = 0;
    let total_cycles = 0;
    let max_depth = 0;
    let largest_tree_root = null;
    const hierarchies = [];

    // Step 3: Process each component independently
    for (let comp of components) {
        // Check for cycles in this component using DFS
        let cycleFound = false;
        const visited = new Set();
        const recStack = new Set();

        function checkCycle(node) {
            visited.add(node);
            recStack.add(node);
            if (fullAdj[node]) {
                for (let child of fullAdj[node]) {
                    if (recStack.has(child)) {
                        cycleFound = true;
                    } else if (!visited.has(child)) {
                        checkCycle(child);
                    }
                }
            }
            recStack.delete(node);
        }

        for (let node of comp) {
            if (!visited.has(node)) {
                checkCycle(node);
            }
        }

        if (cycleFound) {
            // It's a cycle group
            total_cycles++;
            const compRoots = [...comp].filter(n => inDegree[n] === 0).sort();
            const root = compRoots.length > 0 ? compRoots[0] : [...comp].sort()[0];
            
            hierarchies.push({ root, tree: {}, has_cycle: true });
        } else {
            // It's a DAG. Apply diamond rule to edges within this component
            const parentMap = {};
            const treeAdj = {};
            const compEdges = valid_edges.filter(e => comp.has(e[0]) && comp.has(e[3]));

            for (let edge of compEdges) {
                const u = edge[0], v = edge[3];
                if (parentMap[v] !== undefined) continue; // Diamond rule
                parentMap[v] = u;
                if (!treeAdj[u]) treeAdj[u] = [];
                treeAdj[u].push(v);
            }

            // Find roots after diamond rule
            const treeRoots = [...comp].filter(n => parentMap[n] === undefined).sort();

            for (let root of treeRoots) {
                total_trees++;
                
                function buildTree(node) {
                    let maxChildDepth = 0;
                    const treeObj = {};
                    if (treeAdj[node]) {
                        for (let child of treeAdj[node]) {
                            const { depth: cd, tree: ct } = buildTree(child);
                            maxChildDepth = Math.max(maxChildDepth, cd);
                            treeObj[child] = ct;
                        }
                    }
                    return { depth: maxChildDepth + 1, tree: treeObj };
                }

                const { depth, tree } = buildTree(root);
                hierarchies.push({ root, tree: { [root]: tree }, depth });

                if (depth > max_depth || (depth === max_depth && (!largest_tree_root || root < largest_tree_root))) {
                    max_depth = depth;
                    largest_tree_root = root;
                }
            }
        }
    }

    // Sort hierarchies to ensure deterministic root order
    hierarchies.sort((a, b) => a.root.localeCompare(b.root));

    return {
        // TODO: Replace with your actual credentials
        // user_id format: fullname_ddmmyyyy (e.g. "johndoe_17091999")
        user_id: "sreehaas_penugonda_ddmmyyyy",
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