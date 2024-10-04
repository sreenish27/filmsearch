import ast
import json
import sys

def jsonconvertor(input):
    output = ast.literal_eval(input)
    return json.dumps(output)

if __name__ == "__main__":
    input_str = sys.stdin.read().strip()
    result = jsonconvertor(input_str)
    print(result)

