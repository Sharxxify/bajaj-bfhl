function processData(data) {
    const invalid_entries = [];
    const duplicate_edges = [];
    const valid_edges = [];
    
    const seen_edges = new Set();
    const duplicate_added = new Set();
    
    // a) Validation & b) Duplicate Detection
    if (!Array.isArray(data)) {
        return { error: "data must be an array" };
    }
    
    for (let item of data) {
        if (typeof item !== 'string') {
            invalid_entries.push(item);
            continue;
        }
        item = item.trim();
        if (!/^[A-Z]->[A-Z]$/.test(item)) {
            invalid_entries.push(item);
            continue;
        }
        const u = item[0];
        const v = item[3];
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
    
    // c) Tree Construction
    const adj = {};
    const parent = {};
    const nodes = new Set();
    
    for (let edge of valid_edges) {
        const u = edge[0];
        const v = edge[3];
        nodes.add(u);
        nodes.add(v);
        
        // Diamond rule: first parent wins
        if (parent[v]) {
            continue; 
        }
        parent[v] = u;
        if (!adj[u]) adj[u] = [];
        adj[u].push(v);
    }
    
    const roots = [];
    for (let node of nodes) {
        if (!parent[node]) {
            roots.push(node);
        }
    }
    
    // Find unvisited components to handle pure cycles
    const visited_from_roots = new Set();
    const q = [...roots];
    while (q.length > 0) {
        const curr = q.shift();
        visited_from_roots.add(curr);
        if (adj[curr]) {
            for (let child of adj[curr]) {
                q.push(child);
            }
        }
    }
    
    const unvisited = Array.from(nodes).filter(n => !visited_from_roots.has(n));
    const unvisited_set = new Set(unvisited);
    
    while (unvisited_set.size > 0) {
        const start = unvisited_set.values().next().value;
        let curr = start;
        const path_set = new Set();
        while (!path_set.has(curr) && unvisited_set.has(curr)) {
            path_set.add(curr);
            curr = parent[curr];
        }
        
        // Find lexicographically smallest node in the cycle
        let cycle_min = curr;
        let temp = parent[curr];
        while (temp !== curr) {
            if (temp < cycle_min) cycle_min = temp;
            temp = parent[temp];
        }
        
        roots.push(cycle_min);
        
        // Mark the entire connected component as visited
        const comp_q = [start];
        const comp_visited = new Set([start]);
        while (comp_q.length > 0) {
            const node = comp_q.shift();
            unvisited_set.delete(node);
            
            if (adj[node]) {
                for (let child of adj[node]) {
                    if (!comp_visited.has(child) && unvisited_set.has(child)) {
                        comp_visited.add(child);
                        comp_q.push(child);
                    }
                }
            }
            if (parent[node]) {
                const p = parent[node];
                if (!comp_visited.has(p) && unvisited_set.has(p)) {
                    comp_visited.add(p);
                    comp_q.push(p);
                }
            }
        }
    }
    
    // d) & e) Cycle Detection & Depth Calculation
    let total_trees = 0;
    let total_cycles = 0;
    let max_depth = 0;
    let largest_tree_root = null;
    
    const parsed_trees = [];
    
    for (let root of roots) {
        const visited = new Set();
        const recursion_stack = new Set();
        let has_cycle = false;
        
        function dfs(node) {
            visited.add(node);
            recursion_stack.add(node);
            
            let max_child_depth = 0;
            let tree_obj = {};
            
            if (adj[node]) {
                for (let child of adj[node]) {
                    if (!visited.has(child)) {
                        const { depth: c_depth, tree: c_tree, cycle } = dfs(child);
                        if (cycle) has_cycle = true;
                        max_child_depth = Math.max(max_child_depth, c_depth);
                        tree_obj[child] = c_tree;
                    } else if (recursion_stack.has(child)) {
                        has_cycle = true;
                    }
                }
            }
            
            recursion_stack.delete(node);
            return { depth: max_child_depth + 1, tree: tree_obj, cycle: has_cycle };
        }
        
        const { depth, tree, cycle } = dfs(root);
        
        if (cycle) {
            total_cycles++;
            parsed_trees.push({ root, has_cycle: true, tree: {}, depth: null });
        } else {
            total_trees++;
            parsed_trees.push({ root, has_cycle: false, tree: { [root]: tree }, depth });
            
            if (depth > max_depth) {
                max_depth = depth;
                largest_tree_root = root;
            } else if (depth === max_depth) {
                if (!largest_tree_root || root < largest_tree_root) {
                    largest_tree_root = root;
                }
            }
        }
    }
    
    return {
        user_id: "john_doe_01011990", 
        email_id: "john@example.com",
        college_roll_number: "AB123456",
        invalid_entries,
        duplicate_edges,
        total_trees,
        total_cycles,
        largest_tree_root,
        parsed_trees
    };
}

module.exports = { processData };
