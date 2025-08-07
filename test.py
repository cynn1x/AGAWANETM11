class Solution:
    def longestCommonPrefix(self, strs: list[str]) -> str:
        res = ""
        count = 0
        index = 0
        last = False
        
        
        while index < len(strs):
            if index == len(strs) - 1 or len(strs) < 1:
                last = True
                res = ""
            elif len(strs) == 1:
                res = strs[index] 
                return res
            if not last:
                res = strs[index][0] + strs[index][1]
                
                res_next = strs[index+1][0] + strs[index+1][1]
                if res == res_next:
                    return res
            
            
            index += 1
        return res
                
    print(longestCommonPrefix(["a"]))