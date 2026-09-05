const fs = require('fs');

let code = fs.readFileSync('src/pages/Studio.tsx', 'utf-8');

const search = `              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Edit Modal */}`;
const replace = `              </motion.div>
            ))
          )}
          })()}
        </div>
      </div>

      {/* Edit Modal */}`;
code = code.replace(search, replace);

fs.writeFileSync('src/pages/Studio.tsx', code);
