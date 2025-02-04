// This file was generated by lezer-generator. You probably shouldn't edit it.
import {Parser} from "lezer"
import {startTag, commentContent, elementContext} from "./tokens.js"
import {NodeProp} from "lezer"
export const parser = Parser.deserialize({
  version: 13,
  states: "&lOVQTOOOeQYO'#CcOmQ`O'#CfOrQTO'#CeOOQP'#Ce'#CeOOQP'#Cz'#CzOOQP'#Cq'#CqQVQTOOOOQQ'#Cr'#CrO!aQYO,58}OOQP,58},58}O!iQpO,59QO!tQ`O'#CnOOQP'#DQ'#DQOOQP'#Cu'#CuOrQTO,59PO!yQ`O'#CoOOQP,59P,59POOQP-E6o-E6oOOQQ-E6p-E6pOOQP1G.i1G.iO#OQpO'#ChOOQO'#Cs'#CsO#^QpO1G.lOOQP1G.l1G.lOOQP1G.v1G.vO#iQWO,59YOOQP-E6s-E6sOOQP1G.k1G.kO#nQWO,59ZO#sQWO,59SOOQO-E6q-E6qOOQP7+$W7+$WOOQP7+$b7+$bOOQP1G.t1G.tOOQP1G.u1G.uO#xQ!bO'#CkOOQO1G.n1G.nOOQO'#Ct'#CtO$ZQ!bO,59VOOQO,59V,59VOOQO-E6r-E6rOOQO1G.q1G.q",
  stateData: "$o~OmOS~OPQOUTOWTOpPO~OkWOoYO~OZZO~OPQOQ`OR[OS]OU]OW]O`]Oa]OpPO~OkWOodO~O]eOqhOuiO~OZjO~OZmO~O^nO][Xq[Xu[X~O]eOqpOuqO~OqrO~OqsO~OrtO~OWvO`vOavOrxOsvO~OWvO`vOavOrzOsvO~OsU~",
  goto: "#auPPPPPPPvPv!OP!UPP!YPPz!]!c!i!o!u!{#RPPPP#XPPPPP#]STOVT]R_XRORV_TfZgRunQaRRl_XSORV_QVORbVQXPRcXQgZRogQwtRywQ_RRk_TUOVT^R_",
  nodeNames: "⚠ StartTag StartCloseTag StartCloseTag StartCloseTag Document Text Comment Macro Element OpenTag TagName Attribute AttributeName Is AttributeValue EntityReference CharacterReference MismatchedCloseTag CloseTag SelfClosingTag",
  maxTerm: 37,
  context: elementContext,
  nodeProps: [
    [NodeProp.closedBy, 1,"SelfCloseEndTag EndTag",10,"CloseTag"],
    [NodeProp.openedBy, 19,"OpenTag"]
  ],
  skippedNodes: [0],
  repeatNodeCount: 5,
  tokenData: "5X~R|OX#{XZ%]Z]'O]^%]^p#{pq%]qr#{rs(|st#{tu)auv#{vw*Zw}#{}!O+v!O!P#{!P!Q0n!Q![.n![!^#{!^!_2Q!_!`3y!`!a4i!a!c#{!c!}.n!}#R#{#R#S.n#S#T#{#T#o.n#o#y#{#y#z'O#z$f#{$f$g'O$g#BY#{#BY#BZ'O#BZ$IS#{$IS$I_'O$I_$I|#{$I|$JO'O$JO$JT#{$JT$JU'O$JU$KV#{$KV$KW'O$KW&FU#{&FU&FV'O&FV~#{a$SVs`UPOr#{rs$ist#{uv#{w!^#{!^!_$z!_~#{P$nSUPOt$iuv$iw!^$i!_~$i`%PSs`Or$zst$zuv$zw~$z~%dhm~UPOX$iX^%]^p$ipq%]qt$iuv$iw!^$i!_#y$i#y#z%]#z$f$i$f$g%]$g#BY$i#BY#BZ%]#BZ$IS$i$IS$I_%]$I_$I|$i$I|$JO%]$JO$JT$i$JT$JU%]$JU$KV$i$KV$KW%]$KW&FU$i&FU&FV%]&FV~$i~'Xkm~s`UPOX#{X^'O^p#{pq'Oqr#{rs$ist#{uv#{w!^#{!^!_$z!_#y#{#y#z'O#z$f#{$f$g'O$g#BY#{#BY#BZ'O#BZ$IS#{$IS$I_'O$I_$I|#{$I|$JO'O$JO$JT#{$JT$JU'O$JU$KV#{$KV$KW'O$KW&FU#{&FU&FV'O&FV~#{c)TSrbUPOt$iuv$iw!^$i!_~$i~)fTs`}!O)u!Q![)u!c!})u#R#S)u#T#o)u~)zTW~}!O)u!Q![)u!c!})u#R#S)u#T#o)u~*^TOp*mqs*mst+Ut!]*m!^~*m~*pTOp*mqs*mt!]*m!]!^+P!^~*m~+UO`~~+XROp+bq!]+b!^~+b~+eSOp+bq!]+b!]!^+q!^~+b~+vOa~o,Ra]WZSs`UPOr#{rs$ist#{uv#{w}#{}!O-W!O!Q#{!Q![.n![!^#{!^!_$z!_!c#{!c!}.n!}#R#{#R#S.n#S#T#{#T#o.n#o~#{o-cc]WZSs`UPOr#{rs$ist#{uv#{w}#{}!O.n!O!Q#{!Q![.n![!^#{!^!_$z!_!`#{!`!a0O!a!c#{!c!}.n!}#R#{#R#S.n#S#T#{#T#o.n#o~#{m.ya]WZSs`UPOr#{rs$ist#{uv#{w}#{}!O.n!O!Q#{!Q![.n![!^#{!^!_$z!_!c#{!c!}.n!}#R#{#R#S.n#S#T#{#T#o.n#o~#{c0XVoQs`UPOr#{rs$ist#{uv#{w!^#{!^!_$z!_~#{i0uXs`UPOr#{rs$ist#{uv#{w!^#{!^!_$z!_!`#{!`!a1b!a~#{i1kVuWs`UPOr#{rs$ist#{uv#{w!^#{!^!_$z!_~#{a2VTs`Oq$zqr2fst$zuv$zw~$za2kUs`Or$zst$zuv$zw}$z}!O2}!O~$za3SUs`Or$zst$zuv$zw}$z}!O3f!O~$za3mSpPs`Or$zst$zuv$zw~$zi4SV^Ws`UPOr#{rs$ist#{uv#{w!^#{!^!_$z!_~#{k4rVqYs`UPOr#{rs$ist#{uv#{w!^#{!^!_$z!_~#{",
  tokenizers: [startTag, commentContent, 0, 1, 2, 3, 4],
  topRules: {"Document":[0,5]},
  tokenPrec: 166
})
