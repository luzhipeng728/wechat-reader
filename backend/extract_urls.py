import re

def extract_urls_from_file(input_file, output_file):
    """从文件中提取所有URL并保存到新文件"""
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 使用正则表达式提取所有URL
    url_pattern = r'https?://[^\s\'"，,\])]+'
    urls = re.findall(url_pattern, content)

    # 写入到输出文件，每行一个URL
    with open(output_file, 'w', encoding='utf-8') as f:
        for url in urls:
            f.write(url + '\n')

    print(f"成功提取 {len(urls)} 个URL")
    print(f"已保存到: {output_file}")

if __name__ == "__main__":
    input_file = "../tmp.txt"
    output_file = "../urls.txt"
    extract_urls_from_file(input_file, output_file)
