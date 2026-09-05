const fs = require('fs');
let code = fs.readFileSync('src/pages/Studio.tsx', 'utf-8');

const search = `              </motion.div>
            ))
          )}
          })()}
        </div>`;
const replace = `              </motion.div>
            ))
          )
          })()}
        </div>`;
code = code.replace(search, replace);
fs.writeFileSync('src/pages/Studio.tsx', code);
