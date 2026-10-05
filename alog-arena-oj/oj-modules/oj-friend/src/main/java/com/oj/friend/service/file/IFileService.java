package com.oj.friend.service.file;

import com.oj.file.entity.OSSResult;
import org.springframework.web.multipart.MultipartFile;

public interface IFileService {
    OSSResult upload(MultipartFile file);
}
