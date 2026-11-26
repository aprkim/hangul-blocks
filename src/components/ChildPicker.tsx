import { chime } from '../audio'
import { sayName } from '../sayName'
import { chooseChild, useChildren, type Child } from '../children'
import { tapFeedback } from '../native'

/**
 * "Who's playing?" when more than one child uses this device: each child's animal, big, with
 * their name under it (for the grown-up; the child finds their animal). Tapping says the name
 * in the family's voice if it was recorded.
 */
export function ChildPicker({ onDone }: { onDone: (c: Child) => void }) {
  const { list } = useChildren()
  return (
    <div className="child-picker" role="dialog" aria-label="who is playing">
      <div className="child-picker-row">
        {list.map((c) => (
          <button
            key={c.id}
            type="button"
            className="child-pick"
            aria-label={c.name}
            onPointerDown={(e) => {
              e.preventDefault()
              tapFeedback()
              if (!sayName(c)) chime('star')
              chooseChild(c.id)
              onDone(c)
            }}
          >
            <span className="child-pick-animal">{c.animal}</span>
            <span className="child-pick-name">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
