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
    for (let item of data) {
        if (typeof item !== 'string') {
            invalid_entries.push(String(item));
            continue;
        }
        const trimmed = item.trim();
        if (!/^[A-Z]->[A-Z]$/.test(trimmed)) {
            invalid_entries.push(trimmed || item);
            continue;
        }
        const u = trimmed[0], v = trimmed[3];
        if (u === v) {
            invalid_entries.push(trimmed);
            continue;
        }
        if (seen_edges.has(trimmed)) {
            if (!duplicate_added.has(trimmed)) {
                duplicate_edges.push(trimmed);
                duplicate_added.add(trimmed);
            }
        } else {
            seen_edges.add(trimmed);
            valid_edges.push(trimmed);
        }
    }

    // Step 2: Build adjacency list (diamond rule: first parent wins)
    const adj = {};
    const parentMap = {};
    const nodes = new Set();

    for (let edge of valid_edges) {
        const u = edge[0], v = edge[3];
        nodes.add(u);
        nodes.add(v);
        if (parentMap[v] !== undefined) continue; // diamond: skip later parents
        parentMap[v] = u;
        if (!adj[u]) adj[u] = [];
        adj[u].push(v);
    }

    // Step 3: Find roots (nodes with no parent)
    const roots = [];
    for (let node of [...nodes].sort()) {
        if (parentMap[node] === undefined) roots.push(node);
    }

    // Step 4: Find pure-cycle groups (nodes unreachable from any root)
    const visitedFromRoots = new Set();
    const bfsQ = [...roots];
    while (bfsQ.length > 0) {
        const curr = bfsQ.shift();
        if (visitedFromRoots.has(curr)) continue;
        visitedFromRoots.add(curr);
        if (adj[curr]) for (let child of adj[curr]) bfsQ.push(child);
    }

    const unvisited = new Set([...nodes].filter(n => !visitedFromRoots.has(n)));

    while (unvisited.size > 0) {
        // Find the connected component and pick lex-smallest as root
        const start = [...unvisited].sort()[0];
        const component = new Set();
        const compQ = [start];
        while (compQ.length > 0) {
            const node = compQ.shift();
            if (component.has(node)) continue;
            component.add(node);
            unvisited.delete(node);
            if (adj[node]) for (let c of adj[node]) if (!component.has(c)) compQ.push(c);
            if (parentMap[node] !== undefined && !component.has(parentMap[node]))
                compQ.push(parentMap[node]);
        }
        roots.push([...component].sort()[0]);
    }

    // Step 5: DFS per root — detect cycles, build tree, compute depth
    const hierarchies = [];
    let total_trees = 0;
    let total_cycles = 0;
    let max_depth = 0;
    let largest_tree_root = null;

    // Sort roots so processing order is deterministic
    roots.sort();

    for (let root of roots) {
        const visited = new Set();
        const recStack = new Set();
        let cycleFound = false; // ✅ fresh per root

        function dfs(node) {
            visited.add(node);
            recStack.add(node);
            let maxChildDepth = 0;
            const treeObj = {};

            if (adj[node]) {
                for (let child of adj[node]) {
                    if (recStack.has(child)) {
                        cycleFound = true; // back-edge = cycle
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
            // ✅ No depth, no has_cycle: false
            total_cycles++;
            hierarchies.push({ root, tree: {}, has_cycle: true });
        } else {
            // ✅ No has_cycle field at all
            total_trees++;
            hierarchies.push({ root, tree: { [root]: tree }, depth });

            if (depth > max_depth || (depth === max_depth && (!largest_tree_root || root < largest_tree_root))) {
                max_depth = depth;
                largest_tree_root = root;
            }
        }
    }

    return {
        user_id: "john_doe_01011990",
        email_id: "john@example.com",
        college_roll_number: "AB123456",
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